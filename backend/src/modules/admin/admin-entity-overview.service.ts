import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FulfillmentStatus,
  PaymentStatus,
  ShopKind,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const OPEN_STATUSES: FulfillmentStatus[] = [
  FulfillmentStatus.pending,
  FulfillmentStatus.preparing,
  FulfillmentStatus.ready,
  FulfillmentStatus.out_for_delivery,
];

@Injectable()
export class AdminEntityOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async listPartnerShops() {
    const shops = await this.prisma.shop.findMany({
      where: { kind: ShopKind.shop },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            shopUsers: true,
            shopProducts: true,
            fulfillments: true,
          },
        },
      },
    });

    const openByShop = await this.prisma.orderFulfillment.groupBy({
      by: ['shopId'],
      where: {
        shopId: { in: shops.map((s) => s.id) },
        status: { in: OPEN_STATUSES },
      },
      _count: { _all: true },
    });
    const openMap = new Map(
      openByShop.map((r) => [r.shopId, r._count._all]),
    );

    return shops.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      phone: s.phone,
      email: s.email,
      isActive: s.isActive,
      deliveryZones: s.deliveryZones,
      loginCount: s._count.shopUsers,
      productCount: s._count.shopProducts,
      fulfillmentCount: s._count.fulfillments,
      openFulfillments: openMap.get(s.id) ?? 0,
    }));
  }

  async shopOverview(shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, kind: ShopKind.shop },
      include: {
        _count: { select: { shopUsers: true, shopProducts: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const [byStatus, recent, paidLines, paymentOrders] = await Promise.all([
      this.prisma.orderFulfillment.groupBy({
        by: ['status'],
        where: { shopId },
        _count: { _all: true },
      }),
      this.prisma.orderFulfillment.findMany({
        where: { shopId },
        take: 25,
        orderBy: [{ deliveryDate: 'desc' }, { id: 'desc' }],
        include: {
          order: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              totalAmount: true,
              fulfillmentMode: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
          },
          driver: { select: { id: true, name: true } },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.orderItem.findMany({
        where: {
          fulfillment: { shopId },
          order: { paymentStatus: PaymentStatus.paid },
        },
        select: { quantity: true, unitPrice: true },
      }),
      this.prisma.order.findMany({
        where: {
          fulfillments: { some: { shopId } },
        },
        select: { id: true, paymentStatus: true },
      }),
    ]);

    const attributedGmv = paidLines.reduce(
      (sum, line) => sum + line.quantity * Number(line.unitPrice),
      0,
    );

    const statusCounts = Object.fromEntries(
      byStatus.map((r) => [r.status, r._count._all]),
    ) as Record<string, number>;
    const openFulfillments = OPEN_STATUSES.reduce(
      (n, s) => n + (statusCounts[s] ?? 0),
      0,
    );

    const payments = {
      paid: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    };
    for (const o of paymentOrders) {
      payments[o.paymentStatus] += 1;
    }

    return {
      shop: {
        id: shop.id,
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        email: shop.email,
        isActive: shop.isActive,
        deliveryZones: shop.deliveryZones,
        loginCount: shop._count.shopUsers,
        productCount: shop._count.shopProducts,
      },
      summary: {
        openFulfillments,
        totalFulfillments: byStatus.reduce((n, r) => n + r._count._all, 0),
        byStatus: statusCounts,
        attributedGmv: Number(attributedGmv.toFixed(2)),
        payments,
      },
      recentFulfillments: recent.map((f) => ({
        id: f.id,
        status: f.status,
        deliveryDate: f.deliveryDate,
        driver: f.driver,
        order: {
          id: f.order.id,
          status: f.order.status,
          paymentStatus: f.order.paymentStatus,
          totalAmount: Number(f.order.totalAmount),
          fulfillmentMode: f.order.fulfillmentMode,
          createdAt: f.order.createdAt,
          customerName: f.order.customer?.name ?? null,
        },
        lineTotal: f.items.reduce(
          (s, i) => s + i.quantity * Number(i.unitPrice),
          0,
        ),
        itemCount: f.items.reduce((s, i) => s + i.quantity, 0),
      })),
    };
  }

  async listDriversDirectory() {
    const drivers = await this.prisma.driver.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        user: { select: { id: true, email: true, isActive: true } },
        _count: { select: { fulfillments: true, feedback: true } },
      },
    });

    const openByDriver = await this.prisma.orderFulfillment.groupBy({
      by: ['driverId'],
      where: {
        driverId: { in: drivers.map((d) => d.id) },
        status: { in: OPEN_STATUSES },
      },
      _count: { _all: true },
    });
    const openMap = new Map(
      openByDriver
        .filter((r) => r.driverId)
        .map((r) => [r.driverId!, r._count._all]),
    );

    return drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      isActive: d.isActive,
      email: d.user.email,
      userId: d.user.id,
      userActive: d.user.isActive,
      fulfillmentCount: d._count.fulfillments,
      feedbackCount: d._count.feedback,
      openFulfillments: openMap.get(d.id) ?? 0,
    }));
  }

  async driverOverview(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        user: { select: { id: true, email: true, isActive: true } },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const [byStatus, recent, feedback, recentFeedback] = await Promise.all([
      this.prisma.orderFulfillment.groupBy({
        by: ['status'],
        where: { driverId },
        _count: { _all: true },
      }),
      this.prisma.orderFulfillment.findMany({
        where: { driverId },
        take: 25,
        orderBy: [{ deliveryDate: 'desc' }, { id: 'desc' }],
        include: {
          shop: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              totalAmount: true,
              fulfillmentMode: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
          },
          items: {
            select: { quantity: true, unitPrice: true },
          },
        },
      }),
      this.prisma.driverFeedback.aggregate({
        where: { driverId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.driverFeedback.findMany({
        where: { driverId },
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          tags: true,
          suggestBlock: true,
          createdAt: true,
          orderId: true,
          fulfillmentId: true,
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      byStatus.map((r) => [r.status, r._count._all]),
    ) as Record<string, number>;
    const openFulfillments = OPEN_STATUSES.reduce(
      (n, s) => n + (statusCounts[s] ?? 0),
      0,
    );
    const delivered = statusCounts[FulfillmentStatus.delivered] ?? 0;
    const totalJobs = byStatus.reduce((n, r) => n + r._count._all, 0);

    const paymentOrders = await this.prisma.order.findMany({
      where: { fulfillments: { some: { driverId } } },
      select: { paymentStatus: true },
    });
    const payments = {
      paid: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    };
    for (const o of paymentOrders) {
      payments[o.paymentStatus] += 1;
    }

    return {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        isActive: driver.isActive,
        email: driver.user.email,
        userId: driver.user.id,
        userActive: driver.user.isActive,
      },
      summary: {
        openFulfillments,
        totalJobs,
        delivered,
        deliveryRate:
          totalJobs === 0
            ? 0
            : Number(((delivered / totalJobs) * 100).toFixed(1)),
        byStatus: statusCounts,
        avgRating: feedback._avg.rating
          ? Number(feedback._avg.rating.toFixed(2))
          : null,
        feedbackCount: feedback._count._all,
        payments,
      },
      recentJobs: recent.map((f) => ({
        id: f.id,
        status: f.status,
        deliveryDate: f.deliveryDate,
        shop: f.shop,
        order: {
          id: f.order.id,
          status: f.order.status,
          paymentStatus: f.order.paymentStatus,
          totalAmount: Number(f.order.totalAmount),
          fulfillmentMode: f.order.fulfillmentMode,
          createdAt: f.order.createdAt,
          customerName: f.order.customer?.name ?? null,
        },
        lineTotal: f.items.reduce(
          (s, i) => s + i.quantity * Number(i.unitPrice),
          0,
        ),
        itemCount: f.items.reduce((s, i) => s + i.quantity, 0),
      })),
      recentFeedback: recentFeedback.map((f) => ({
        id: f.id,
        rating: f.rating,
        tags: Array.isArray(f.tags)
          ? (f.tags as unknown[]).filter((t): t is string => typeof t === 'string')
          : [],
        suggestBlock: f.suggestBlock,
        createdAt: f.createdAt,
        orderId: f.orderId,
        fulfillmentId: f.fulfillmentId,
        customer: {
          id: f.customer.id,
          name: f.customer.name,
        },
      })),
    };
  }
}
