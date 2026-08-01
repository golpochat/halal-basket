import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockHoldStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { FulfillmentPlan } from '../routing-engine/routing-engine.service';

export const STOCK_HOLD_TTL_MS = 10 * 60 * 1000;

type Tx = Prisma.TransactionClient;

export type HoldLineExpectation = {
  shopProductId: string;
  productId: string;
  quantity: number;
};

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Units free to sell: on-hand minus active, unexpired holds.
   * Optionally ignore one customer's active hold (when refreshing their hold).
   */
  async availableQty(
    shopProductId: string,
    opts?: { excludeCustomerId?: string; db?: PrismaService | Tx },
  ): Promise<number> {
    const db = opts?.db ?? this.prisma;
    const sp = await db.shopProduct.findUnique({
      where: { id: shopProductId },
      select: { stockQuantity: true, isInStock: true },
    });
    if (!sp || !sp.isInStock) return 0;

    const now = new Date();
    const held = await db.stockHoldLine.aggregate({
      where: {
        shopProductId,
        hold: {
          status: StockHoldStatus.active,
          expiresAt: { gt: now },
          ...(opts?.excludeCustomerId
            ? { customerId: { not: opts.excludeCustomerId } }
            : {}),
        },
      },
      _sum: { quantity: true },
    });

    return Math.max(0, sp.stockQuantity - (held._sum.quantity ?? 0));
  }

  async assertLinesAvailable(
    lines: HoldLineExpectation[],
    opts?: { excludeCustomerId?: string; db?: PrismaService | Tx },
  ) {
    for (const line of lines) {
      const available = await this.availableQty(line.shopProductId, opts);
      if (line.quantity > available) {
        throw new BadRequestException(
          `Insufficient stock for product ${line.productId} (need ${line.quantity}, available ${available})`,
        );
      }
    }
  }

  flattenRouteLines(fulfillments: FulfillmentPlan[]): HoldLineExpectation[] {
    return fulfillments.flatMap((f) =>
      f.linePricings.map((l) => ({
        shopProductId: l.shopProductId,
        productId: l.productId,
        quantity: l.quantity,
      })),
    );
  }

  async createOrReplaceHold(input: {
    customerId: string;
    fulfillments: FulfillmentPlan[];
  }): Promise<{ holdId: string; expiresAt: Date }> {
    const lines = this.flattenRouteLines(input.fulfillments);
    if (lines.length === 0) {
      throw new BadRequestException('Hold requires at least one line');
    }

    await this.assertLinesAvailable(lines, {
      excludeCustomerId: input.customerId,
    });

    const expiresAt = new Date(Date.now() + STOCK_HOLD_TTL_MS);

    return this.prisma.$transaction(async (tx) => {
      await tx.stockHold.updateMany({
        where: {
          customerId: input.customerId,
          status: StockHoldStatus.active,
        },
        data: { status: StockHoldStatus.released },
      });

      // Re-check after releasing our own hold (availability may still fail vs others).
      await this.assertLinesAvailable(lines, { db: tx });

      const hold = await tx.stockHold.create({
        data: {
          customerId: input.customerId,
          status: StockHoldStatus.active,
          expiresAt,
          lines: {
            create: lines.map((l) => ({
              shopProductId: l.shopProductId,
              productId: l.productId,
              quantity: l.quantity,
            })),
          },
        },
      });

      return { holdId: hold.id, expiresAt: hold.expiresAt };
    });
  }

  /**
   * Lock shop products, verify hold, decrement stock, mark hold consumed.
   * Expected lines must match hold lines (same shopProductId + quantity).
   */
  async consumeHoldInTx(
    tx: Tx,
    input: {
      holdId: string;
      customerId: string;
      expectedLines: HoldLineExpectation[];
    },
  ) {
    const hold = await tx.stockHold.findUnique({
      where: { id: input.holdId },
      include: { lines: true },
    });
    if (!hold || hold.customerId !== input.customerId) {
      throw new NotFoundException('Stock hold not found');
    }
    if (hold.status !== StockHoldStatus.active) {
      throw new BadRequestException('Stock hold is no longer active');
    }
    if (hold.expiresAt.getTime() <= Date.now()) {
      await tx.stockHold.update({
        where: { id: hold.id },
        data: { status: StockHoldStatus.released },
      });
      throw new BadRequestException('Stock hold expired — try again');
    }

    this.assertHoldMatchesRoute(hold.lines, input.expectedLines);

    const shopProductIds = [
      ...new Set(hold.lines.map((l) => l.shopProductId)),
    ];
    await this.lockShopProducts(tx, shopProductIds);

    for (const line of hold.lines) {
      await this.decrementStockLocked(tx, line.shopProductId, line.quantity, {
        // Hold still active until we mark consumed — exclude this customer's
        // hold so we don't double-count reservation against ourselves.
        excludeCustomerId: input.customerId,
      });
    }

    await tx.stockHold.update({
      where: { id: hold.id },
      data: { status: StockHoldStatus.consumed },
    });
  }

  /**
   * No hold: lock + check available (all active holds) + decrement.
   */
  async reserveAndDecrementInTx(
    tx: Tx,
    lines: HoldLineExpectation[],
  ) {
    const shopProductIds = [...new Set(lines.map((l) => l.shopProductId))];
    await this.lockShopProducts(tx, shopProductIds);

    for (const line of lines) {
      await this.decrementStockLocked(tx, line.shopProductId, line.quantity);
    }
  }

  private assertHoldMatchesRoute(
    holdLines: Array<{
      shopProductId: string;
      productId: string;
      quantity: number;
    }>,
    expected: HoldLineExpectation[],
  ) {
    if (holdLines.length !== expected.length) {
      throw new BadRequestException(
        'Basket changed since hold — refresh and try again',
      );
    }
    const bySp = new Map(
      holdLines.map((l) => [l.shopProductId, l] as const),
    );
    for (const line of expected) {
      const held = bySp.get(line.shopProductId);
      if (
        !held ||
        held.productId !== line.productId ||
        held.quantity !== line.quantity
      ) {
        throw new BadRequestException(
          'Basket changed since hold — refresh and try again',
        );
      }
    }
  }

  private async lockShopProducts(tx: Tx, shopProductIds: string[]) {
    if (shopProductIds.length === 0) return;
    // Deterministic lock order to reduce deadlocks.
    const ids = [...shopProductIds].sort();
    await tx.$queryRawUnsafe(
      `SELECT id FROM shop_products WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
      ids,
    );
  }

  private async decrementStockLocked(
    tx: Tx,
    shopProductId: string,
    quantity: number,
    opts?: { excludeCustomerId?: string },
  ) {
    const available = await this.availableQty(shopProductId, {
      db: tx,
      excludeCustomerId: opts?.excludeCustomerId,
    });
    if (quantity > available) {
      throw new BadRequestException(
        `Insufficient stock (need ${quantity}, available ${available})`,
      );
    }

    const updated = await tx.shopProduct.update({
      where: { id: shopProductId },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });

    if (updated.stockQuantity <= 0) {
      await tx.shopProduct.update({
        where: { id: shopProductId },
        data: {
          stockQuantity: 0,
          isInStock: false,
          lastStockUpdateAt: new Date(),
        },
      });
    }
  }

  /** Sync isInStock / stockQuantity when shop/admin patches stock. */
  resolveStockPatch(input: {
    currentQty: number;
    currentInStock: boolean;
    stockQuantity?: number;
    isInStock?: boolean;
  }): { stockQuantity: number; isInStock: boolean } {
    let qty = input.currentQty;
    let inStock = input.currentInStock;

    if (input.stockQuantity !== undefined) {
      qty = Math.max(0, Math.floor(input.stockQuantity));
      inStock = qty > 0;
    }

    if (input.isInStock !== undefined) {
      inStock = input.isInStock;
      if (!inStock) {
        qty = 0;
      } else if (qty <= 0) {
        qty = 1;
      }
    }

    return { stockQuantity: qty, isInStock: inStock };
  }
}
