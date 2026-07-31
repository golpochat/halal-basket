import { Injectable } from '@nestjs/common';
import { FulfillmentStatus, OrderEventType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      ordersTotal,
      ordersCompleted,
      ordersCancelled,
      paidOrders,
      refunds,
      complaints,
      blockedCustomers,
      missingFeedback,
      fulfillments,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.order.count({ where: { status: 'cancelled' } }),
      this.prisma.order.count({ where: { paymentStatus: PaymentStatus.paid } }),
      this.prisma.orderEvent.count({ where: { eventType: OrderEventType.refund } }),
      this.prisma.orderEvent.count({
        where: { eventType: OrderEventType.complaint },
      }),
      this.prisma.customer.count({ where: { isBlocked: true } }),
      this.prisma.driverFeedback.findMany({
        where: {},
        select: { tags: true },
      }),
      this.prisma.orderFulfillment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const missingItemReports = missingFeedback.filter((f) => {
      const tags = Array.isArray(f.tags) ? (f.tags as unknown[]) : [];
      return tags.includes('item_missing');
    }).length;

    const revenueAgg = await this.prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.paid },
      _sum: { totalAmount: true },
    });

    const delivered =
      fulfillments.find((f) => f.status === FulfillmentStatus.delivered)?._count
        ._all ?? 0;
    const fulfillmentTotal = fulfillments.reduce(
      (s, f) => s + f._count._all,
      0,
    );

    return {
      orders: {
        total: ordersTotal,
        completed: ordersCompleted,
        cancelled: ordersCancelled,
        successRate:
          ordersTotal === 0
            ? 0
            : Number(((ordersCompleted / ordersTotal) * 100).toFixed(1)),
      },
      payments: {
        paidOrders,
        revenue: Number(revenueAgg._sum.totalAmount ?? 0),
        refunds,
      },
      fulfillments: {
        byStatus: Object.fromEntries(
          fulfillments.map((f) => [f.status, f._count._all]),
        ),
        deliveryRate:
          fulfillmentTotal === 0
            ? 0
            : Number(((delivered / fulfillmentTotal) * 100).toFixed(1)),
      },
      trust: {
        complaints,
        blockedCustomers,
        missingItemReports,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
