import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentStatus,
  OrderEventType,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RoutingEngineService } from '../routing-engine/routing-engine.service';
import { PlatformLocaleService } from '../platform-locale/platform-locale.service';
import { StockService } from '../stock/stock.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { MetricsService } from '../../common/metrics.service';
import {
  OrderLiveHub,
  type OrderLiveSnapshot,
} from './order-live.hub';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RoutingEngineService,
    private readonly platform: PlatformLocaleService,
    private readonly stock: StockService,
    private readonly metrics: MetricsService,
    private readonly liveHub: OrderLiveHub,
    private readonly whatsapp: WhatsappService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new ForbiddenException('Customer profile required');
    }
    if (customer.isBlocked) {
      throw new ForbiddenException('Customer is blocked');
    }

    const route = await this.routing.route({
      fulfillmentMode: dto.fulfillmentMode,
      preferredShopId: dto.preferredShopId,
      deliveryAreaName: dto.deliveryAreaName,
      deliveryAddress: dto.deliveryAddress,
      customerRiskScore: customer.riskScore,
      customerId: customer.id,
      items: dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    }).catch((err) => {
      this.metrics.inc('routingFailures');
      this.metrics.inc('orderCreateFailures');
      throw err;
    });

    const expectedLines = this.stock.flattenRouteLines(route.fulfillments);

    const subtotalAmount = route.fulfillments
      .flatMap((f) => f.linePricings)
      .reduce(
        (sum, line) =>
          sum.add(new Prisma.Decimal(line.unitPrice).mul(line.quantity)),
        new Prisma.Decimal(0),
      );

    const deliveryFeeAmount = await this.platform.resolveDeliveryFee({
      mode: route.fulfillmentMode,
      deliveryAreaName: dto.deliveryAreaName,
      subtotal: subtotalAmount,
    });

    let discountAmount = new Prisma.Decimal(0);
    let appliedCoupon: string | null = null;
    if (dto.couponCode?.trim()) {
      const validated = await this.platform.validateCoupon(
        {
          code: dto.couponCode,
          subtotal: Number(subtotalAmount.toString()),
        },
        { customerId: customer.id },
      );
      if (!validated.ok) {
        throw new BadRequestException(validated.message);
      }
      discountAmount = new Prisma.Decimal(validated.discountAmount);
      appliedCoupon = validated.code;
    }

    const totalAmount = subtotalAmount
      .sub(discountAmount)
      .add(deliveryFeeAmount);
    if (totalAmount.lessThan(0)) {
      throw new BadRequestException('Order total cannot be negative');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.holdId) {
        await this.stock.consumeHoldInTx(tx, {
          holdId: dto.holdId,
          customerId: customer.id,
          expectedLines,
        });
      } else {
        await this.stock.reserveAndDecrementInTx(tx, expectedLines);
      }

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          fulfillmentMode: route.fulfillmentMode,
          status: OrderStatus.confirmed,
          subtotalAmount,
          discountAmount,
          deliveryFeeAmount,
          totalAmount,
          couponCode: appliedCoupon,
          deliveryAddress: dto.deliveryAddress
            ? (dto.deliveryAddress as Prisma.InputJsonValue)
            : undefined,
          deliveryAreaName: dto.deliveryAreaName?.trim() || null,
          preferredShopId: dto.preferredShopId,
          paymentStatus: 'pending',
          riskScoreAtOrder: customer.riskScore,
        },
      });

      for (const plan of route.fulfillments) {
        const fulfillment = await tx.orderFulfillment.create({
          data: {
            orderId: order.id,
            shopId: plan.shopId,
            status: FulfillmentStatus.pending,
            deliveryDate: plan.deliveryDate,
            estimatedDeliveryAt: plan.estimatedDeliveryAt,
          },
        });

        await tx.orderItem.createMany({
          data: plan.linePricings.map((line) => ({
            orderId: order.id,
            fulfillmentId: fulfillment.id,
            productId: line.productId,
            shopProductId: line.shopProductId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        });

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            fulfillmentId: fulfillment.id,
            actorUserId: userId,
            eventType: OrderEventType.status_change,
            payload: {
              orderStatus: OrderStatus.confirmed,
              fulfillmentStatus: FulfillmentStatus.pending,
              shopId: plan.shopId,
              multiShop: route.fulfillments.length > 1,
              deliveryFeeAmount: deliveryFeeAmount.toString(),
              discountAmount: discountAmount.toString(),
              couponCode: appliedCoupon,
              holdId: dto.holdId ?? null,
            },
          },
        });
      }

      return this.getByIdInternal(tx, order.id);
    }).then((created) => {
      this.metrics.inc('orderCreates');
      this.whatsapp.notifySafe(
        () => this.whatsapp.notifyOrderPlaced(created.id),
        `order_placed ${created.id}`,
      );
      return created;
    });
  }

  /** Soft-reserve stock for checkout confirm (TTL). */
  async createStockHold(userId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new ForbiddenException('Customer profile required');
    }
    if (customer.isBlocked) {
      throw new ForbiddenException('Customer is blocked');
    }

    const route = await this.routing.route({
      fulfillmentMode: dto.fulfillmentMode,
      preferredShopId: dto.preferredShopId,
      deliveryAreaName: dto.deliveryAreaName,
      deliveryAddress: dto.deliveryAddress,
      customerRiskScore: customer.riskScore,
      customerId: customer.id,
      items: dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });

    return this.stock.createOrReplaceHold({
      customerId: customer.id,
      fulfillments: route.fulfillments,
    });
  }

  /** Dry-run routing for checkout confirm — no order, no shop identity. */
  async previewRoute(userId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new ForbiddenException('Customer profile required');
    }
    if (customer.isBlocked) {
      throw new ForbiddenException('Customer is blocked');
    }

    return this.routing.previewAvailability({
      fulfillmentMode: dto.fulfillmentMode,
      preferredShopId: dto.preferredShopId,
      deliveryAreaName: dto.deliveryAreaName,
      deliveryAddress: dto.deliveryAddress,
      customerRiskScore: customer.riskScore,
      customerId: customer.id,
      items: dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });
  }

  async getByIdForUser(orderId: string, userId: string, role: string) {
    const order = await this.getByIdInternal(this.prisma, orderId);
    if (role === UserRole.admin || role === UserRole.super_admin) return order;

    if (role === UserRole.customer) {
      const customer = await this.prisma.customer.findUnique({
        where: { userId },
      });
      if (!customer || order.customerId !== customer.id) {
        throw new ForbiddenException();
      }
      return order;
    }

    throw new ForbiddenException();
  }

  /** Customer, assigned driver, linked shop, or admin may watch live status. */
  async assertCanWatchLive(orderId: string, userId: string, role: string) {
    if (role === UserRole.admin || role === UserRole.super_admin) {
      await this.getByIdInternal(this.prisma, orderId);
      return;
    }

    if (role === UserRole.customer) {
      await this.getByIdForUser(orderId, userId, role);
      return;
    }

    if (role === UserRole.driver) {
      const driver = await this.prisma.driver.findUnique({ where: { userId } });
      if (!driver) throw new ForbiddenException();
      const assigned = await this.prisma.orderFulfillment.findFirst({
        where: { orderId, driverId: driver.id },
        select: { id: true },
      });
      if (!assigned) throw new ForbiddenException();
      return;
    }

    if (role === UserRole.shop) {
      const links = await this.prisma.shopUser.findMany({ where: { userId } });
      const shopIds = links.map((l) => l.shopId);
      if (shopIds.length === 0) throw new ForbiddenException();
      const owned = await this.prisma.orderFulfillment.findFirst({
        where: { orderId, shopId: { in: shopIds } },
        select: { id: true },
      });
      if (!owned) throw new ForbiddenException();
      return;
    }

    throw new ForbiddenException();
  }

  buildStatusSnapshot(
    order: Awaited<ReturnType<OrdersService['getByIdInternal']>>,
  ): OrderLiveSnapshot {
    const fulfillmentCount = order.fulfillments.length;
    return {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentMode: order.fulfillmentMode,
      updatedAt: order.updatedAt,
      polledAt: new Date().toISOString(),
      fulfillmentCount,
      splitOrder: fulfillmentCount > 1,
      fulfillments: order.fulfillments.map((f, index) => ({
        id: f.id,
        part: index + 1,
        partsTotal: fulfillmentCount,
        shopId: f.shopId,
        shopName: f.shop?.name,
        shopAddress: f.shop?.address ?? null,
        status: f.status,
        deliveryDate: f.deliveryDate,
        estimatedDeliveryAt: f.estimatedDeliveryAt,
      })),
    };
  }

  /** Lightweight poll / stream payload for live status. */
  async getStatusSnapshot(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<OrderLiveSnapshot> {
    await this.assertCanWatchLive(orderId, userId, role);
    const order = await this.getByIdInternal(this.prisma, orderId);
    return this.buildStatusSnapshot(order);
  }

  /** Push latest snapshot to all open live streams for this order. */
  async notifyLive(orderId: string) {
    const order = await this.getByIdInternal(this.prisma, orderId);
    this.liveHub.publish(orderId, this.buildStatusSnapshot(order));
  }

  async listMine(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) throw new ForbiddenException('Customer profile required');

    return this.prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        fulfillments: { include: { shop: true } },
        items: { include: { product: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordStatusEvent(input: {
    orderId: string;
    fulfillmentId: string;
    actorUserId: string;
    fulfillmentStatus: FulfillmentStatus;
    orderStatus?: OrderStatus;
    note?: string;
    reasons?: string[];
  }) {
    await this.prisma.orderEvent.create({
      data: {
        orderId: input.orderId,
        fulfillmentId: input.fulfillmentId,
        actorUserId: input.actorUserId,
        eventType: OrderEventType.status_change,
        payload: {
          fulfillmentStatus: input.fulfillmentStatus,
          orderStatus: input.orderStatus,
          note: input.note,
          reasons: input.reasons,
        },
      },
    });
    this.whatsapp.notifySafe(
      () =>
        this.whatsapp.notifyFulfillmentUpdate(
          input.orderId,
          String(input.fulfillmentStatus).replaceAll('_', ' '),
          input.note,
        ),
      `fulfillment ${input.orderId} ${input.fulfillmentStatus}`,
    );
  }

  private async getByIdInternal(
    db: Prisma.TransactionClient | PrismaService,
    orderId: string,
  ) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        fulfillments: { include: { shop: true, driver: true } },
        items: { include: { product: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async assertOwnedFulfillment(fulfillmentId: string) {
    const fulfillment = await this.prisma.orderFulfillment.findUnique({
      where: { id: fulfillmentId },
      include: { order: true },
    });
    if (!fulfillment) throw new NotFoundException('Fulfillment not found');
    return fulfillment;
  }

  /** Aggregate parent order status from all fulfillments. */
  async recomputeOrderStatus(orderId: string): Promise<OrderStatus> {
    const fulfillments = await this.prisma.orderFulfillment.findMany({
      where: { orderId },
    });
    const statuses = fulfillments.map((f) => f.status);

    let next: OrderStatus;
    if (statuses.length === 0) {
      next = OrderStatus.pending;
    } else if (statuses.every((s) => s === FulfillmentStatus.cancelled)) {
      next = OrderStatus.cancelled;
    } else if (
      statuses.every(
        (s) =>
          s === FulfillmentStatus.delivered ||
          s === FulfillmentStatus.cancelled,
      ) &&
      statuses.some((s) => s === FulfillmentStatus.delivered)
    ) {
      next = OrderStatus.completed;
    } else if (
      statuses.some(
        (s) =>
          s === FulfillmentStatus.preparing ||
          s === FulfillmentStatus.ready ||
          s === FulfillmentStatus.out_for_delivery ||
          s === FulfillmentStatus.delivered ||
          s === FulfillmentStatus.failed_attempt,
      )
    ) {
      // failed_attempt keeps the order in progress until reschedule or cancel.
      next = OrderStatus.in_progress;
    } else {
      next = OrderStatus.confirmed;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: next },
    });
    return next;
  }

  syncOrderStatusFromFulfillment(
    fulfillmentStatus: FulfillmentStatus,
  ): OrderStatus | undefined {
    // Deprecated for multi-fulfillment; callers should use recomputeOrderStatus.
    switch (fulfillmentStatus) {
      case FulfillmentStatus.preparing:
      case FulfillmentStatus.ready:
      case FulfillmentStatus.out_for_delivery:
      case FulfillmentStatus.failed_attempt:
        return OrderStatus.in_progress;
      case FulfillmentStatus.delivered:
        return OrderStatus.completed;
      case FulfillmentStatus.cancelled:
        return OrderStatus.cancelled;
      default:
        return undefined;
    }
  }
}
