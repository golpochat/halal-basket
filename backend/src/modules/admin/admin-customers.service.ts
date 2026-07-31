import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.customer.findMany({
      include: {
        user: { select: { id: true, email: true, phone: true, isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async setBlocked(
    customerId: string,
    isBlocked: boolean,
    actorUserId?: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { isBlocked },
      include: {
        user: { select: { id: true, email: true, phone: true, isActive: true } },
      },
    });
    await this.audit.log({
      actorUserId,
      action: isBlocked ? 'customer.block' : 'customer.unblock',
      entityType: 'customer',
      entityId: customerId,
      payload: { isBlocked },
    });
    return updated;
  }
}
