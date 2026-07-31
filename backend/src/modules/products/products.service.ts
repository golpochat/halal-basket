import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QrCodeService } from './qr-code.service';

export type ProductImportRow = {
  name: string;
  slug: string;
  category?: string;
  description?: string;
  image_url?: string;
  tags?: string;
  is_active?: string | boolean;
  barcode: string;
  qr_code?: string;
  sku?: string;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrCodeService,
  ) {}

  list(activeOnly = true) {
    return this.prisma.product.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async upsertFromImport(
    row: ProductImportRow,
    shopId?: string,
  ): Promise<{ productId: string; barcode: string }> {
    if (!row.barcode?.trim()) {
      throw new ConflictException('barcode is required');
    }
    const barcode = row.barcode.trim();
    const slug = row.slug.trim();
    const isActive =
      row.is_active === undefined
        ? true
        : typeof row.is_active === 'boolean'
          ? row.is_active
          : ['1', 'true', 'yes', 'y'].includes(String(row.is_active).toLowerCase());

    let categoryId: string | undefined;
    if (row.category?.trim()) {
      const catSlug = row.category
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
      const category = await this.prisma.category.upsert({
        where: { slug: catSlug },
        update: { name: row.category.trim() },
        create: { name: row.category.trim(), slug: catSlug },
      });
      categoryId = category.id;
    }

    const tags = this.parseTags(row.tags);
    const existing = await this.prisma.product.findUnique({
      where: { barcode },
    });

    let productId: string;
    if (existing) {
      const qrCode =
        row.qr_code?.trim() ||
        existing.qrCode ||
        this.qr.buildPayload(barcode, existing.id);
      const qrCodeImageUrl =
        existing.qrCodeImageUrl ?? (await this.qr.generateDataUrl(qrCode));
      const updated = await this.prisma.product.update({
        where: { id: existing.id },
        data: {
          name: row.name.trim(),
          slug,
          categoryId,
          description: row.description,
          imageUrl: row.image_url,
          tags,
          isActive,
          qrCode,
          qrCodeImageUrl,
          sku: row.sku,
        },
      });
      productId = updated.id;
    } else {
      const tempPayload = row.qr_code?.trim() || this.qr.buildPayload(barcode);
      const created = await this.prisma.product.create({
        data: {
          name: row.name.trim(),
          slug,
          categoryId,
          description: row.description,
          imageUrl: row.image_url,
          tags,
          isActive,
          barcode,
          qrCode: tempPayload,
          sku: row.sku,
        },
      });
      const qrCode =
        row.qr_code?.trim() || this.qr.buildPayload(barcode, created.id);
      const qrCodeImageUrl = await this.qr.generateDataUrl(qrCode);
      await this.prisma.product.update({
        where: { id: created.id },
        data: { qrCode, qrCodeImageUrl },
      });
      productId = created.id;
    }

    if (shopId) {
      await this.prisma.shopProduct.upsert({
        where: {
          shopId_productId: { shopId, productId },
        },
        update: {
          stockStatusSource: 'import',
          lastStockUpdateAt: new Date(),
          isVisible: true,
        },
        create: {
          shopId,
          productId,
          price: new Prisma.Decimal(0),
          isInStock: true,
          stockStatusSource: 'import',
          lastStockUpdateAt: new Date(),
          isVisible: true,
        },
      });
    }

    return { productId, barcode };
  }

  async exportRows() {
    const products = await this.prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category?.name ?? '',
      description: p.description ?? '',
      image_url: p.imageUrl ?? '',
      tags: Array.isArray(p.tags) ? (p.tags as string[]).join('|') : '',
      is_active: p.isActive,
      barcode: p.barcode,
      qr_code: p.qrCode,
      sku: p.sku ?? '',
    }));
  }

  private parseTags(raw?: string): string[] {
    if (!raw?.trim()) return [];
    return raw
      .split(/[|,]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
