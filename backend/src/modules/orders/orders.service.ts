import {
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
import { CreateOrderDto } from './dto/create-order.dto';
import { MetricsService } from '../../common/metrics.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RoutingEngineService,
    private readonly metrics: MetricsService,
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
      items: dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    }).catch((err) => {
      this.metrics.inc('routingFailures');
      this.metrics.inc('orderCreateFailures');
      throw err;
    });

    const totalAmount = route.fulfillments
      .flatMap((f) => f.linePricings)
      .reduce(
        (sum, line) =>
          sum.add(new Prisma.Decimal(line.unitPrice).mul(line.quantity)),
        new Prisma.Decimal(0),
      );

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          fulfillmentMode: route.fulfillmentMode,
          status: OrderStatus.confirmed,
          totalAmount,
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
            },
          },
        });
      }

      return this.getByIdInternal(tx, order.id);
    }).then((created) => {
      this.metrics.inc('orderCreates');
      return created;
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

  /** Lightweight poll payload for live status. */
  async getStatusSnapshot(orderId: string, userId: string, role: string) {
    const order = await this.getByIdForUser(orderId, userId, role);
    return {
      id: order.id,
      status: order.status,
      fulfillmentMode: order.fulfillmentMode,
      updatedAt: order.updatedAt,
      fulfillments: order.fulfillments.map((f) => ({
        id: f.id,
        shopId: f.shopId,
        shopName: f.shop?.name,
        status: f.status,
        deliveryDate: f.deliveryDate,
        estimatedDeliveryAt: f.estimatedDeliveryAt,
      })),
    };
  }

  async listMine(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) throw new ForbiddenException('Customer profile required');

    return this.prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        fulfillments: true,
        items: true,
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
        },
      },
    });
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
          s === FulfillmentStatus.delivered,
      )
    ) {
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
