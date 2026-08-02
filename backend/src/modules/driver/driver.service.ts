import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FulfillmentStatus, OrderEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import {
  DriverFeedbackDto,
  DriverUpdateStatusDto,
} from './dto/driver.dto';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { StockPredictionService } from '../stock-prediction/stock-prediction.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly risk: RiskEngineService,
    private readonly stockPrediction: StockPredictionService,
  ) {}

  private async getDriver(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver || !driver.isActive) {
      throw new ForbiddenException('Driver profile required');
    }
    return driver;
  }

  private fulfillmentListInclude() {
    return {
      order: { include: { customer: true, items: true } },
      shop: true,
      items: { include: { product: true } },
    } as const;
  }

  async todaysOrders(userId: string, _role: string) {
    const driver = await this.getDriver(userId);
    const today = new Date();
    const day = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    return this.prisma.orderFulfillment.findMany({
      where: {
        driverId: driver.id,
        status: {
          notIn: [
            FulfillmentStatus.delivered,
            FulfillmentStatus.failed_attempt,
            FulfillmentStatus.cancelled,
          ],
        },
        OR: [
          { deliveryDate: { gte: day } },
          {
            deliveryDate: null,
            order: { fulfillmentMode: 'pickup' },
          },
        ],
      },
      include: this.fulfillmentListInclude(),
      orderBy: [{ deliveryDate: 'asc' }, { id: 'asc' }],
    });
  }

  /** Past assigned jobs: delivered or cancelled (newest delivery date first). */
  async orderHistory(userId: string, _role: string) {
    const driver = await this.getDriver(userId);

    return this.prisma.orderFulfillment.findMany({
      where: {
        driverId: driver.id,
        status: {
          in: [
            FulfillmentStatus.delivered,
            FulfillmentStatus.failed_attempt,
            FulfillmentStatus.cancelled,
          ],
        },
      },
      include: this.fulfillmentListInclude(),
      orderBy: [{ deliveryDate: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  async getAssignedOrder(
    userId: string,
    _role: string,
    fulfillmentId: string,
  ) {
    const driver = await this.getDriver(userId);
    const fulfillment = await this.prisma.orderFulfillment.findFirst({
      where: { id: fulfillmentId, driverId: driver.id },
      include: {
        shop: true,
        items: { include: { product: true } },
        order: {
          include: {
            customer: {
              include: {
                // Phone only — email not needed for stop completion (minimize PII).
                user: { select: { phone: true } },
              },
            },
          },
        },
      },
    });
    if (!fulfillment) {
      throw new NotFoundException('Delivery not found');
    }
    return fulfillment;
  }

  async updateStatus(
    userId: string,
    _role: string,
    fulfillmentId: string,
    dto: DriverUpdateStatusDto,
  ) {
    const driver = await this.getDriver(userId);
    const fulfillment = await this.orders.assertOwnedFulfillment(fulfillmentId);
    if (fulfillment.driverId !== driver.id) {
      throw new ForbiddenException('Fulfillment not assigned to you');
    }

    const status = dto.status;
    const reasons = (dto.reasons ?? [])
      .map((r) => r.trim())
      .filter(Boolean);

    if (status === FulfillmentStatus.failed_attempt && reasons.length === 0) {
      throw new BadRequestException(
        'Select at least one reason for the failed attempt',
      );
    }

    const updated = await this.prisma.orderFulfillment.update({
      where: { id: fulfillmentId },
      data: { status },
    });
    const orderStatus = await this.orders.recomputeOrderStatus(
      fulfillment.orderId,
    );

    await this.orders.recordStatusEvent({
      orderId: fulfillment.orderId,
      fulfillmentId,
      actorUserId: userId,
      fulfillmentStatus: status,
      orderStatus,
      note: dto.note?.trim() || undefined,
      reasons:
        status === FulfillmentStatus.failed_attempt ? reasons : undefined,
    });

    await this.orders.notifyLive(fulfillment.orderId);

    return updated;
  }

  async feedback(
    userId: string,
    _role: string,
    fulfillmentId: string,
    dto: DriverFeedbackDto,
  ) {
    const driver = await this.getDriver(userId);
    const fulfillment = await this.orders.assertOwnedFulfillment(fulfillmentId);
    if (fulfillment.driverId !== driver.id) {
      throw new ForbiddenException('Fulfillment not assigned to you');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: fulfillment.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const feedback = await this.prisma.driverFeedback.create({
      data: {
        driverId: driver.id,
        customerId: order.customerId,
        orderId: order.id,
        fulfillmentId,
        rating: dto.rating,
        tags: dto.tags ?? [],
        suggestBlock: dto.suggestBlock ?? false,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        fulfillmentId,
        actorUserId: userId,
        eventType: OrderEventType.driver_feedback_linked,
        payload: {
          feedbackId: feedback.id,
          rating: dto.rating,
          tags: dto.tags ?? [],
          suggestBlock: dto.suggestBlock ?? false,
        },
      },
    });

    const riskScore = await this.risk.recalculateCustomer(order.customerId);
    const stock = await this.stockPrediction.evaluateAfterFeedback(fulfillmentId);

    return { feedback, riskScore, stock };
  }
}
