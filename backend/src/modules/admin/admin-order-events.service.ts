import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderEventType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';

@Injectable()
export class AdminOrderEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly risk: RiskEngineService,
  ) {}

  async recordRefund(
    orderId: string,
    actorUserId: string,
    reason?: string,
    amount?: number,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const event = await this.prisma.orderEvent.create({
      data: {
        orderId,
        actorUserId,
        eventType: OrderEventType.refund,
        payload: { reason: reason ?? null, amount: amount ?? null },
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.refunded },
    });

    await this.audit.log({
      actorUserId,
      action: 'order.refund',
      entityType: 'order',
      entityId: orderId,
      payload: { eventId: event.id, reason, amount },
    });

    const riskScore = await this.risk.recalculateCustomer(order.customerId);
    return { event, riskScore };
  }

  async recordComplaint(
    orderId: string,
    actorUserId: string,
    note?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const event = await this.prisma.orderEvent.create({
      data: {
        orderId,
        actorUserId,
        eventType: OrderEventType.complaint,
        payload: { note: note ?? null },
      },
    });

    await this.audit.log({
      actorUserId,
      action: 'order.complaint',
      entityType: 'order',
      entityId: orderId,
      payload: { eventId: event.id, note },
    });

    const riskScore = await this.risk.recalculateCustomer(order.customerId);
    return { event, riskScore };
  }
}
