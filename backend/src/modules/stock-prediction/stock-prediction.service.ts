import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StockPredictionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * If `item_missing` appears on feedback for fulfillments containing the same
   * shop_product at least twice within 3 days → mark OOS (system).
   */
  async evaluateAfterFeedback(fulfillmentId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { fulfillmentId },
      select: { shopProductId: true },
    });
    const shopProductIds = [...new Set(items.map((i) => i.shopProductId))];
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const updated: string[] = [];

    for (const shopProductId of shopProductIds) {
      const feedbacks = await this.prisma.driverFeedback.findMany({
        where: {
          createdAt: { gte: since },
          fulfillmentId: { not: null },
        },
        select: { id: true, tags: true, fulfillmentId: true },
      });

      let hits = 0;
      for (const fb of feedbacks) {
        const tags = Array.isArray(fb.tags) ? (fb.tags as unknown[]) : [];
        if (!tags.includes('item_missing') || !fb.fulfillmentId) continue;
        const hasProduct = await this.prisma.orderItem.findFirst({
          where: {
            fulfillmentId: fb.fulfillmentId,
            shopProductId,
          },
          select: { id: true },
        });
        if (hasProduct) hits += 1;
      }

      if (hits >= 2) {
        await this.prisma.shopProduct.update({
          where: { id: shopProductId },
          data: {
            isInStock: false,
            stockStatusSource: 'system',
            lastStockUpdateAt: new Date(),
          },
        });
        updated.push(shopProductId);
      }
    }

    return { evaluated: shopProductIds.length, markedOutOfStock: updated };
  }
}
