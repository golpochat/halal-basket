import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';

const OPEN_FULFILLMENT: FulfillmentStatus[] = [
  FulfillmentStatus.pending,
  FulfillmentStatus.preparing,
  FulfillmentStatus.ready,
  FulfillmentStatus.out_for_delivery,
  FulfillmentStatus.failed_attempt,
];

@Injectable()
export class GdprService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportCustomer(customerId: string, actorUserId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        orders: {
          include: {
            fulfillments: true,
            items: true,
            events: true,
          },
        },
        feedback: true,
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.audit.log({
      actorUserId,
      action: 'gdpr.export',
      entityType: 'customer',
      entityId: customerId,
    });

    return {
      exportedAt: new Date().toISOString(),
      customer,
    };
  }

  async privacySummary(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            fulfillments: { select: { status: true } },
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const alreadyErased =
      customer.name === 'Erased Customer' ||
      customer.user.email.startsWith('erased+');

    const orderCount = customer.orders.length;
    const paidOrders = customer.orders.filter(
      (o) => o.paymentStatus === PaymentStatus.paid,
    ).length;
    const pendingPayments = customer.orders.filter(
      (o) =>
        o.paymentStatus === PaymentStatus.pending &&
        o.status !== OrderStatus.cancelled,
    ).length;
    const openFulfillments = customer.orders.reduce(
      (n, o) =>
        n +
        o.fulfillments.filter((f) => OPEN_FULFILLMENT.includes(f.status))
          .length,
      0,
    );

    const blockers: string[] = [];
    if (alreadyErased) blockers.push('Customer is already erased');
    if (openFulfillments > 0) {
      blockers.push(
        `${openFulfillments} open fulfillment(s) — complete or cancel before erase`,
      );
    }
    if (pendingPayments > 0) {
      blockers.push(
        `${pendingPayments} order(s) with unsettled payment — settle or cancel before erase`,
      );
    }

    return {
      customerId: customer.id,
      name: customer.name,
      email: customer.user.email,
      phone: customer.user.phone,
      isBlocked: customer.isBlocked,
      isActive: customer.user.isActive,
      alreadyErased,
      orderCount,
      paidOrders,
      pendingPayments,
      openFulfillments,
      canErase: blockers.length === 0,
      blockers,
      note:
        'Orders and payment records are retained for accounting. Erase anonymizes personal data only.',
    };
  }

  async eraseCustomer(customerId: string, actorUserId: string) {
    const summary = await this.privacySummary(customerId);
    if (!summary.canErase) {
      throw new BadRequestException({
        message: 'Customer cannot be erased yet',
        blockers: summary.blockers,
        summary,
      });
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const anonEmail = `erased+${customer.id}@halalbasket.invalid`;
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          name: 'Erased Customer',
          addressList: [],
          isBlocked: true,
          riskScore: 0,
        },
      });
      await tx.user.update({
        where: { id: customer.userId },
        data: {
          email: anonEmail,
          phone: null,
          isActive: false,
          passwordHash,
        },
      });
      // Scrub delivery PII on retained orders; keep totals/payment status.
      await tx.order.updateMany({
        where: { customerId },
        data: {
          deliveryAddress: Prisma.DbNull,
          deliveryAreaName: null,
        },
      });
      await tx.driverFeedback.updateMany({
        where: { customerId },
        data: { tags: [], suggestBlock: false },
      });
    });

    await this.audit.log({
      actorUserId,
      action: 'gdpr.erase',
      entityType: 'customer',
      entityId: customerId,
      payload: {
        orderCount: summary.orderCount,
        paidOrders: summary.paidOrders,
      },
    });

    return {
      erased: true,
      customerId,
      retainedOrders: summary.orderCount,
      message:
        summary.orderCount > 0
          ? `Personal data anonymized. ${summary.orderCount} order record(s) retained without delivery address.`
          : 'Personal data anonymized.',
    };
  }
}
