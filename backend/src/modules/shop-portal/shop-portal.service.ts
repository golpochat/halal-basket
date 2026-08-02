import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { StockService } from '../stock/stock.service';
import { UpdateShopProductDto } from './dto/shop-portal.dto';

@Injectable()
export class ShopPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly stock: StockService,
  ) {}

  async resolveShopIds(userId: string, _role: string): Promise<string[]> {
    const links = await this.prisma.shopUser.findMany({ where: { userId } });
    if (links.length === 0) {
      throw new ForbiddenException('No shop linked to this user');
    }
    return links.map((l) => l.shopId);
  }

  async listDrivers() {
    return this.prisma.driver.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async listOrders(userId: string, role: string, deliveryDate?: string) {
    const shopIds = await this.resolveShopIds(userId, role);
    return this.prisma.orderFulfillment.findMany({
      where: {
        shopId: { in: shopIds },
        ...(deliveryDate
          ? { deliveryDate: new Date(deliveryDate) }
          : {}),
      },
      include: {
        order: { include: { customer: true, items: true } },
        shop: true,
        driver: true,
        items: { include: { product: true } },
      },
      orderBy: [{ deliveryDate: 'asc' }, { id: 'asc' }],
    });
  }

  async updateStatus(
    userId: string,
    role: string,
    fulfillmentId: string,
    status: Parameters<OrdersService['syncOrderStatusFromFulfillment']>[0],
  ) {
    const shopIds = await this.resolveShopIds(userId, role);
    const fulfillment = await this.orders.assertOwnedFulfillment(fulfillmentId);
    if (!shopIds.includes(fulfillment.shopId)) {
      throw new ForbiddenException('Fulfillment not in your shops');
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
    });

    await this.orders.notifyLive(fulfillment.orderId);

    return updated;
  }

  async listProducts(userId: string, role: string) {
    const shopIds = await this.resolveShopIds(userId, role);
    return this.prisma.shopProduct.findMany({
      where: { shopId: { in: shopIds } },
      include: { product: true, shop: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async updateProduct(
    userId: string,
    role: string,
    shopProductId: string,
    dto: UpdateShopProductDto,
  ) {
    const shopIds = await this.resolveShopIds(userId, role);
    const sp = await this.prisma.shopProduct.findUnique({
      where: { id: shopProductId },
    });
    if (!sp) throw new NotFoundException('Shop product not found');
    if (!shopIds.includes(sp.shopId)) {
      throw new ForbiddenException('Product not in your shops');
    }

    const stockPatch = this.stock.resolveStockPatch({
      currentQty: sp.stockQuantity,
      currentInStock: sp.isInStock,
      stockQuantity: dto.stockQuantity,
      isInStock: dto.isInStock,
    });

    return this.prisma.shopProduct.update({
      where: { id: shopProductId },
      data: {
        price:
          dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        discountPrice:
          dto.discountPrice === undefined
            ? undefined
            : dto.discountPrice === null
              ? null
              : new Prisma.Decimal(dto.discountPrice),
        isInStock: stockPatch.isInStock,
        stockQuantity: stockPatch.stockQuantity,
        isVisible: dto.isVisible,
        stockStatusSource: 'shop',
        lastStockUpdateAt: new Date(),
      },
      include: { product: true },
    });
  }

  async assignDriver(
    userId: string,
    role: string,
    fulfillmentId: string,
    driverId: string,
  ) {
    const shopIds = await this.resolveShopIds(userId, role);
    const fulfillment = await this.orders.assertOwnedFulfillment(fulfillmentId);
    if (!shopIds.includes(fulfillment.shopId)) {
      throw new ForbiddenException('Fulfillment not in your shops');
    }

    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, isActive: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return this.prisma.orderFulfillment.update({
      where: { id: fulfillmentId },
      data: { driverId },
      include: { driver: true, order: true },
    });
  }
}
