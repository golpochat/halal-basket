import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShopKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto, UpsertShopProductDto } from './dto/shop.dto';
import {
  activeShopsWithPublishedWarehouses,
  getPublishedWarehouseIds,
} from '../platform-locale/warehouse-publish';
import { StockService } from '../stock/stock.service';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  listActive() {
    return this.prisma.shop.findMany({
      where: { isActive: true, kind: ShopKind.shop },
      orderBy: { name: 'asc' },
    });
  }

  listAll() {
    return this.prisma.shop.findMany({ orderBy: { name: 'asc' } });
  }

  async getById(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  create(dto: CreateShopDto) {
    return this.prisma.shop.create({
      data: {
        name: dto.name,
        kind: ShopKind.shop,
        parentCompanyId: dto.parentCompanyId,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        openingHours: (dto.openingHours ?? {}) as Prisma.InputJsonValue,
        deliveryZones: (dto.deliveryZones ?? []) as Prisma.InputJsonValue,
        lat: dto.lat,
        lng: dto.lng,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listShopProducts(shopId: string) {
    return this.prisma.shopProduct.findMany({
      where: {
        shopId,
        isVisible: true,
        product: { isActive: true },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  /**
   * Brand-facing catalogue: one row per product across active shops.
   * When `area` is set, only shops whose deliveryZones include that area.
   * Warehouse stock included only for published warehouse IDs.
   * No shop id/name in the response.
   */
  async listPlatformCatalogue(area?: string) {
    const publishedWarehouseIds = await getPublishedWarehouseIds(this.prisma);
    const shops = await this.prisma.shop.findMany({
      where: activeShopsWithPublishedWarehouses(publishedWarehouseIds),
    });
    const areaNorm = area?.trim().toLowerCase() ?? '';
    const shopIds = shops
      .filter((shop) => {
        if (!areaNorm) return true;
        const zones = Array.isArray(shop.deliveryZones)
          ? (shop.deliveryZones as unknown[])
          : [];
        return zones.some(
          (z) => typeof z === 'string' && z.trim().toLowerCase() === areaNorm,
        );
      })
      .map((s) => s.id);

    if (shopIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.shopProduct.findMany({
      where: {
        shopId: { in: shopIds },
        isVisible: true,
        product: { isActive: true },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    type Acc = {
      productId: string;
      isInStock: boolean;
      bestPrice: Prisma.Decimal | null;
      product: (typeof rows)[0]['product'];
    };

    const byProduct = new Map<string, Acc>();

    for (const row of rows) {
      const unit = row.discountPrice ?? row.price;
      const existing = byProduct.get(row.productId);
      if (!existing) {
        byProduct.set(row.productId, {
          productId: row.productId,
          isInStock: row.isInStock,
          bestPrice: row.isInStock ? unit : null,
          product: row.product,
        });
        continue;
      }
      if (row.isInStock) {
        existing.isInStock = true;
        if (
          existing.bestPrice == null ||
          unit.lessThan(existing.bestPrice)
        ) {
          existing.bestPrice = unit;
        }
      }
    }

    // Fallback price for OOS-only products: lowest listed price
    for (const row of rows) {
      const acc = byProduct.get(row.productId);
      if (!acc || acc.bestPrice != null) continue;
      const unit = row.discountPrice ?? row.price;
      if (acc.bestPrice == null || unit.lessThan(acc.bestPrice)) {
        acc.bestPrice = unit;
      }
    }

    return Array.from(byProduct.values())
      .map((acc) => ({
        id: acc.productId,
        productId: acc.productId,
        price: (acc.bestPrice ?? new Prisma.Decimal(0)).toString(),
        discountPrice: null as string | null,
        isInStock: acc.isInStock,
        product: acc.product,
      }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name));
  }

  async upsertShopProduct(shopId: string, dto: UpsertShopProductDto) {
    await this.getById(shopId);
    const existing = await this.prisma.shopProduct.findUnique({
      where: {
        shopId_productId: { shopId, productId: dto.productId },
      },
    });
    const stockPatch = this.stock.resolveStockPatch({
      currentQty: existing?.stockQuantity ?? 0,
      currentInStock: existing?.isInStock ?? true,
      stockQuantity:
        dto.stockQuantity !== undefined
          ? dto.stockQuantity
          : existing
            ? undefined
            : dto.isInStock === false
              ? 0
              : 100,
      isInStock: dto.isInStock,
    });

    return this.prisma.shopProduct.upsert({
      where: {
        shopId_productId: { shopId, productId: dto.productId },
      },
      update: {
        price: new Prisma.Decimal(dto.price),
        discountPrice:
          dto.discountPrice !== undefined
            ? new Prisma.Decimal(dto.discountPrice)
            : undefined,
        isInStock: stockPatch.isInStock,
        stockQuantity: stockPatch.stockQuantity,
        isVisible: dto.isVisible,
        stockStatusSource: 'shop',
        lastStockUpdateAt: new Date(),
      },
      create: {
        shopId,
        productId: dto.productId,
        price: new Prisma.Decimal(dto.price),
        discountPrice:
          dto.discountPrice !== undefined
            ? new Prisma.Decimal(dto.discountPrice)
            : undefined,
        isInStock: stockPatch.isInStock,
        stockQuantity: stockPatch.stockQuantity,
        isVisible: dto.isVisible ?? true,
        stockStatusSource: 'shop',
        lastStockUpdateAt: new Date(),
      },
      include: { product: true },
    });
  }
}
