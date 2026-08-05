import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function resolveProductImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/')) {
    const base = (
      process.env.PUBLIC_API_URL ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}${value}`;
  }
  return value;
}

@Injectable()
export class FavouritesService {
  constructor(private readonly prisma: PrismaService) {}

  private async customerIdForUser(userId: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer.id;
  }

  async listIds(userId: string) {
    const customerId = await this.customerIdForUser(userId);
    const rows = await this.prisma.customerFavourite.findMany({
      where: { customerId },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });
    return { productIds: rows.map((r) => r.productId) };
  }

  async list(userId: string) {
    const customerId = await this.customerIdForUser(userId);
    const rows = await this.prisma.customerFavourite.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            isActive: true,
            tags: true,
          },
        },
      },
    });
    return {
      items: rows.map((r) => ({
        productId: r.productId,
        createdAt: r.createdAt,
        product: r.product
          ? {
              ...r.product,
              imageUrl: resolveProductImageUrl(r.product.imageUrl),
            }
          : r.product,
      })),
    };
  }

  async add(userId: string, productId: string) {
    if (!productId?.trim()) {
      throw new BadRequestException('productId is required');
    }
    const customerId = await this.customerIdForUser(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    try {
      await this.prisma.customerFavourite.create({
        data: { customerId, productId },
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === 'P2002') {
        throw new ConflictException('Already in favourites');
      }
      throw err;
    }
    return this.listIds(userId);
  }

  async remove(userId: string, productId: string) {
    const customerId = await this.customerIdForUser(userId);
    const result = await this.prisma.customerFavourite.deleteMany({
      where: { customerId, productId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Favourite not found');
    }
    return this.listIds(userId);
  }
}
