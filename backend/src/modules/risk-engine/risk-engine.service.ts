import { Injectable } from '@nestjs/common';
import { OrderEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RiskEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateCustomer(customerId: string): Promise<number> {
    const [refunds, complaints, feedbacks] = await Promise.all([
      this.prisma.orderEvent.count({
        where: {
          eventType: OrderEventType.refund,
          order: { customerId },
        },
      }),
      this.prisma.orderEvent.count({
        where: {
          eventType: OrderEventType.complaint,
          order: { customerId },
        },
      }),
      this.prisma.driverFeedback.findMany({
        where: { customerId },
        select: { rating: true, tags: true },
      }),
    ]);

    let score = refunds * 10 + complaints * 8;

    for (const fb of feedbacks) {
      const tags = Array.isArray(fb.tags) ? (fb.tags as unknown[]) : [];
      for (const tag of tags) {
        if (tag === 'rude') score += 15;
        if (tag === 'frequent_refunder') score += 10;
      }
    }

    if (feedbacks.length > 0) {
      const avg =
        feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
      if (avg < 3) score += 10;
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { riskScore: score },
    });

    return score;
  }

  async recalculateForOrder(orderId: string): Promise<number | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });
    if (!order) return null;
    return this.recalculateCustomer(order.customerId);
  }
}
