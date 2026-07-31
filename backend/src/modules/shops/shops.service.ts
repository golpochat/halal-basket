import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto, UpsertShopProductDto } from './dto/shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.shop.findMany({
      where: { isActive: true },
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

  async upsertShopProduct(shopId: string, dto: UpsertShopProductDto) {
    await this.getById(shopId);
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
        isInStock: dto.isInStock,
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
        isInStock: dto.isInStock ?? true,
        isVisible: dto.isVisible ?? true,
        stockStatusSource: 'shop',
        lastStockUpdateAt: new Date(),
      },
      include: { product: true },
    });
  }
}
