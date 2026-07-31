import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';

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

  async eraseCustomer(customerId: string, actorUserId: string) {
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
    });

    return { erased: true, customerId };
  }
}
