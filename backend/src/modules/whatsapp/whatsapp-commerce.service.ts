import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FulfillmentMode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { normalizeE164 } from './phone';
import {
  isMetaCommerceAllowedProduct,
  isBlockedByMetaCommercePolicy,
} from './meta-catalog-eligibility';
import {
  WHATSAPP_PROVIDER,
  type WhatsappCatalogProduct,
  type WhatsappProvider,
} from './whatsapp.provider';
import { WhatsappService } from './whatsapp.service';

export type CommerceCartItem = {
  productId: string;
  quantity: number;
};

export type PendingCommerceDraft = {
  catalogId?: string | null;
  items: CommerceCartItem[];
  note?: string;
  receivedAt: string;
};

const CATALOG_SYNC_LIMIT = 100;

@Injectable()
export class WhatsappCommerceService {
  private readonly log = new Logger(WhatsappCommerceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsappService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsappProvider,
  ) {}

  catalogConfigured(): boolean {
    return Boolean(this.config.get<string>('WHATSAPP_CATALOG_ID')?.trim());
  }

  /**
   * Same Meta-safe product set used for catalog sync / thumbnails.
   * Admin Simulate uses this so cart product IDs always match the DB.
   */
  async listCatalogCandidates(limit = CATALOG_SYNC_LIMIT) {
    const { products, skippedMetaPolicy } =
      await this.loadSyncCandidatesDetailed(limit);
    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      })),
      skippedMetaPolicy,
      limit,
    };
  }

  async syncCatalog() {
    const { products, skippedMetaPolicy } = await this.loadSyncCandidatesDetailed();
    const payload: WhatsappCatalogProduct[] = products.map((p) => ({
      retailerId: p.id,
      name: p.name,
      description: p.description ?? p.name,
      price: p.price,
      currency: 'EUR',
      imageUrl: this.metaSafeImageUrl(p.imageUrl),
      // Meta rejects localhost / http product links (error 1803071).
      url: this.metaSafeProductUrl() ?? undefined,
    }));

    const result = await this.provider.upsertCatalogProducts(payload);

    const blockedIds = await this.loadBlockedRetailerIds();
    let pruned = 0;
    if (blockedIds.length > 0 && this.catalogConfigured()) {
      const prune = await this.provider.deleteCatalogProductsByRetailerIds(
        blockedIds,
      );
      pruned = prune.deleted;
      if (pruned > 0) {
        this.log.log(
          `Pruned ${pruned} Meta-blocked catalog items (meat/fish/eggs)`,
        );
      }
    }

    return {
      ...result,
      catalogConfigured: this.catalogConfigured(),
      sampleRetailerIds: payload.slice(0, 5).map((p) => p.retailerId),
      skippedMetaPolicy,
      prunedMetaPolicy: pruned,
    };
  }

  async sendCatalogToPhone(phoneE164: string) {
    const phone = normalizeE164(phoneE164);
    if (!phone) throw new BadRequestException('Invalid phone');

    const thumb = await this.loadSyncCandidates(1);
    const thumbId = thumb[0]?.id;
    const bodyText =
      'Browse Halal Basket pantry & grocery staples — add items to your cart, then send the order. For fresh meat, fish & eggs, use the Assist / Shop link.';

    if (this.catalogConfigured()) {
      try {
        await this.provider.sendCatalogMessage(phone, {
          bodyText,
          thumbnailRetailerId: thumbId,
        });
      } catch (err) {
        // Meta #131009: thumbnail retailer_id not indexed / approved yet.
        // Catalog message still works without thumbnail_product_retailer_id.
        if (
          thumbId &&
          err instanceof BadRequestException &&
          /Products not found/i.test(String(err.message))
        ) {
          this.log.warn(
            `Catalog thumbnail ${thumbId} rejected by Meta — retrying without thumbnail`,
          );
          await this.provider.sendCatalogMessage(phone, { bodyText });
        } else {
          throw err;
        }
      }
      return { sent: true as const, mode: 'catalog_message' as const };
    }

    const base = this.whatsapp.customerAppBase();
    await this.provider.sendText(
      phone,
      [
        'WhatsApp catalog is not linked yet (set WHATSAPP_CATALOG_ID).',
        `Shop in the app: ${base}/`,
        'Or reply LIST and a teammate will help.',
      ].join('\n'),
    );
    return { sent: true as const, mode: 'text_fallback' as const };
  }

  /**
   * Place HB order from WhatsApp cart lines, or park draft if customer unlinked.
   * Never throws to Meta webhook callers — returns outcome.
   */
  async handleCommerceCart(input: {
    phoneE164: string;
    items: CommerceCartItem[];
    catalogId?: string | null;
    providerMessageId?: string | null;
  }): Promise<{
    threadId: string;
    placed: boolean;
    orderId?: string;
    needsAssistance: boolean;
  }> {
    const phoneE164 = normalizeE164(input.phoneE164);
    if (!phoneE164) {
      throw new BadRequestException('Invalid phone');
    }
    const items = this.normalizeItems(input.items);
    if (items.length === 0) {
      throw new BadRequestException('Cart has no valid items');
    }

    const user = await this.prisma.user.findFirst({
      where: { phone: phoneE164 },
      select: {
        id: true,
        customer: {
          select: { id: true, addressList: true, isBlocked: true },
        },
      },
    });

    let thread = await (this.prisma as any).whatsappThread.findUnique({
      where: { phoneE164 },
    });
    if (!thread) {
      thread = await (this.prisma as any).whatsappThread.create({
        data: {
          phoneE164,
          customerId: user?.customer?.id ?? null,
          status: 'open',
        },
      });
    } else if (user?.customer?.id && !thread.customerId) {
      thread = await (this.prisma as any).whatsappThread.update({
        where: { id: thread.id },
        data: { customerId: user.customer.id, status: 'open' },
      });
    }

    const summary = items
      .map((i) => `${i.quantity}× ${i.productId.slice(0, 8)}`)
      .join(', ');
    await (this.prisma as any).whatsappMessage.create({
      data: {
        threadId: thread.id,
        direction: 'inbound',
        body: `[commerce cart] ${summary}`,
        providerMessageId: input.providerMessageId ?? null,
      },
    });

    const draft: PendingCommerceDraft = {
      catalogId: input.catalogId ?? null,
      items,
      receivedAt: new Date().toISOString(),
    };

    if (!user?.customer || user.customer.isBlocked) {
      await this.parkDraft(thread.id, draft, phoneE164, [
        'We received your WhatsApp cart but this number is not linked to an account.',
        `Sign in and set your phone in Profile: ${this.whatsapp.customerAppBase()}/customer/profile`,
        'Then reply ORDER or ask us to retry — a teammate can also help.',
      ].join('\n'));
      return {
        threadId: thread.id,
        placed: false,
        needsAssistance: true,
      };
    }

    try {
      const dto = this.buildCreateDto(user.customer.addressList, items);
      const order = await this.orders.create(user.id, dto);
      const payUrl = `${this.whatsapp.customerAppBase()}/orders/${order.id}/confirmation`;
      const ref = this.whatsapp.orderRef(order.id);
      const detailed = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: { product: { select: { name: true } } },
            orderBy: { product: { name: 'asc' } },
          },
        },
      });
      const lines = detailed?.items ?? [];
      const itemLines = this.formatOrderItemLines(lines);
      const subtotal = Number(detailed?.subtotalAmount ?? order.subtotalAmount);
      const delivery = Number(
        detailed?.deliveryFeeAmount ?? order.deliveryFeeAmount,
      );
      const total = Number(detailed?.totalAmount ?? order.totalAmount);
      const moneyLines = [
        `Subtotal: €${subtotal.toFixed(2)}`,
        ...(delivery > 0 ? [`Delivery: €${delivery.toFixed(2)}`] : []),
        `Total due: €${total.toFixed(2)}`,
      ];
      const bodyText = [
        `Order ${ref}`,
        '',
        ...itemLines,
        '',
        ...moneyLines,
        'Payment is pending — your basket is held until you pay.',
      ].join('\n');
      const inboxBody = `${bodyText}\n[Pay securely] ${payUrl}`;

      await this.sendPayCta(
        phoneE164,
        bodyText,
        payUrl,
        lines.reduce((sum, l) => sum + l.quantity, 0) ||
          items.reduce((sum, i) => sum + i.quantity, 0),
      );
      await (this.prisma as any).whatsappMessage.create({
        data: {
          threadId: thread.id,
          direction: 'outbound',
          body: inboxBody,
        },
      });
      await (this.prisma as any).whatsappThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          status: 'open',
          needsAssistance: false,
          pendingCommerceJson: Prisma.DbNull,
        },
      });

      return {
        threadId: thread.id,
        placed: true,
        orderId: order.id,
        needsAssistance: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`Commerce place failed for ${phoneE164}: ${msg}`);
      await this.parkDraft(thread.id, { ...draft, note: msg }, phoneE164, [
        'We could not place that cart automatically.',
        msg.slice(0, 200),
        'A teammate will help — or browse the app and checkout there.',
        this.whatsapp.customerAppBase() + '/',
      ].join('\n'));
      return {
        threadId: thread.id,
        placed: false,
        needsAssistance: true,
      };
    }
  }

  async sendCatalogForThread(threadId: string) {
    const thread = await (this.prisma as any).whatsappThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    const result = await this.sendCatalogToPhone(thread.phoneE164);
    const body =
      result.mode === 'catalog_message'
        ? '[catalog message sent]'
        : '[catalog unavailable — shop link sent]';
    await (this.prisma as any).whatsappMessage.create({
      data: {
        threadId: thread.id,
        direction: 'outbound',
        body,
      },
    });
    await (this.prisma as any).whatsappThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date(), status: 'open' },
    });
    return result;
  }

  private formatOrderItemLines(
    lines: Array<{
      quantity: number;
      unitPrice: { toString(): string } | number;
      product: { name: string };
    }>,
  ): string[] {
    const formatted = lines.map((line) => {
      const unit = Number(line.unitPrice);
      const lineTotal = unit * line.quantity;
      return `• ${line.quantity}× ${line.product.name} — €${lineTotal.toFixed(2)}`;
    });
    if (formatted.join('\n').length > 550) {
      const shown = formatted.slice(0, 8);
      const rest = formatted.length - shown.length;
      return rest > 0
        ? [...shown, `• …and ${rest} more item${rest === 1 ? '' : 's'}`]
        : shown;
    }
    return formatted;
  }

  private async sendPayCta(
    phoneE164: string,
    bodyText: string,
    payUrl: string,
    itemCount: number,
  ) {
    const publicApi = this.config.get<string>('PUBLIC_API_URL')?.trim() ?? '';
    const headerImageUrl =
      /^https:\/\//i.test(publicApi) && !/localhost/i.test(publicApi)
        ? `${publicApi.replace(/\/$/, '')}/uploads/branding/whatsapp-pay-header.png`
        : undefined;

    const footerText =
      itemCount === 1
        ? '1 item · tap to complete payment'
        : `${itemCount} items · tap to complete payment`;

    const send = (imageUrl?: string) =>
      this.provider.sendCtaUrl(phoneE164, {
        bodyText,
        buttonText: 'Pay securely',
        url: payUrl,
        headerText: imageUrl ? undefined : 'Halal Basket',
        headerImageUrl: imageUrl,
        footerText,
      });

    try {
      await send(headerImageUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Dead/unreachable PUBLIC_API_URL → Meta cannot fetch header image → keep the CTA button.
      if (headerImageUrl && /media|weblink|resolve host|502|403/i.test(msg)) {
        this.log.warn(
          `Pay CTA header image failed (${msg}); retrying CTA with text header`,
        );
        try {
          await send(undefined);
          return;
        } catch (retryErr) {
          this.log.warn(
            `Pay CTA retry failed, falling back to text: ${
              retryErr instanceof Error ? retryErr.message : String(retryErr)
            }`,
          );
        }
      } else {
        this.log.warn(`Pay CTA failed, falling back to text: ${msg}`);
      }
      await this.provider.sendText(
        phoneE164,
        `${bodyText}\n\nPay securely: ${payUrl}`,
      );
    }
  }

  private async parkDraft(
    threadId: string,
    draft: PendingCommerceDraft,
    phoneE164: string,
    reply: string,
  ) {
    await this.provider.sendText(phoneE164, reply);
    await (this.prisma as any).whatsappMessage.create({
      data: {
        threadId,
        direction: 'outbound',
        body: reply,
      },
    });
    await (this.prisma as any).whatsappThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        status: 'open',
        needsAssistance: true,
        pendingCommerceJson: draft as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private buildCreateDto(
    addressList: Prisma.JsonValue,
    items: CommerceCartItem[],
  ) {
    const addresses = Array.isArray(addressList) ? addressList : [];
    const first = addresses.find(
      (a) => a && typeof a === 'object' && !Array.isArray(a),
    ) as Record<string, unknown> | undefined;

    const area =
      typeof first?.area_name === 'string' ? first.area_name.trim() : '';

    if (area && first) {
      return {
        fulfillmentMode: FulfillmentMode.scheduled_delivery,
        deliveryAreaName: area,
        deliveryAddress: first,
        items,
      };
    }

    return {
      fulfillmentMode: FulfillmentMode.pickup,
      items,
    };
  }

  private normalizeItems(items: CommerceCartItem[]): CommerceCartItem[] {
    const map = new Map<string, number>();
    for (const raw of items) {
      const id = String(raw.productId ?? '').trim();
      const qty = Math.floor(Number(raw.quantity));
      if (!id || qty < 1) continue;
      map.set(id, (map.get(id) ?? 0) + qty);
    }
    return [...map.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private async loadSyncCandidates(limit = CATALOG_SYNC_LIMIT) {
    const { products } = await this.loadSyncCandidatesDetailed(limit);
    return products;
  }

  private async loadSyncCandidatesDetailed(limit = CATALOG_SYNC_LIMIT) {
    const rows = await this.prisma.shopProduct.findMany({
      where: {
        isVisible: true,
        isInStock: true,
        stockQuantity: { gt: 0 },
        product: {
          isActive: true,
          // Primary DB cut: never sync Meat & Poultry category to Meta.
          OR: [
            { categoryId: null },
            { category: { slug: { not: 'meat-poultry' } } },
          ],
        },
      },
      include: {
        product: { include: { category: true } },
      },
      // Over-fetch so egg / name-based Meta policy filter still fills the cap.
      take: Math.max(limit * 8, 200),
      orderBy: [{ stockQuantity: 'desc' }, { product: { name: 'asc' } }],
    });

    type Acc = {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      price: number;
    };
    const byProduct = new Map<string, Acc>();
    let skippedMetaPolicy = 0;

    for (const row of rows) {
      const p = row.product;
      const allowed = isMetaCommerceAllowedProduct({
        name: p.name,
        slug: p.slug,
        description: p.description,
        categorySlug: p.category?.slug,
        categoryName: p.category?.name,
        tags: p.tags,
      });
      if (!allowed) {
        skippedMetaPolicy += 1;
        continue;
      }

      const unit = Number(row.discountPrice ?? row.price);
      const existing = byProduct.get(row.productId);
      if (!existing || unit < existing.price) {
        byProduct.set(row.productId, {
          id: row.productId,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          price: unit,
        });
      }
      if (byProduct.size >= limit) break;
    }

    return {
      products: [...byProduct.values()].slice(0, limit),
      skippedMetaPolicy,
    };
  }

  /** Product IDs that must not remain in the Meta catalog. */
  private async loadBlockedRetailerIds(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      take: 2000,
    });
    return products
      .filter((p) =>
        isBlockedByMetaCommercePolicy({
          name: p.name,
          slug: p.slug,
          description: p.description,
          categorySlug: p.category?.slug,
          categoryName: p.category?.name,
          tags: p.tags,
        }),
      )
      .map((p) => p.id);
  }

  /**
   * Meta Commerce requires a fetchable https:// image_url.
   * Relative `/uploads/...` paths become absolute via PUBLIC_API_URL.
   * Localhost / non-HTTPS URLs are omitted (Meta rejects them as invalid URIs).
   */
  private metaSafeImageUrl(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;
    const raw = value.trim();
    const absolute = /^https?:\/\//i.test(raw)
      ? raw
      : `${(
          this.config.get<string>('PUBLIC_API_URL')?.trim() ||
          'http://localhost:3000'
        ).replace(/\/$/, '')}${raw.startsWith('/') ? raw : `/${raw}`}`;
    return this.metaSafeHttpsUrl(absolute);
  }

  /**
   * Product landing `url` for Meta catalog. Prefer public customer app;
   * fall back to PUBLIC_API_URL. Never send localhost (Meta 1803071).
   */
  private metaSafeProductUrl(): string | null {
    const candidates = [
      this.config.get<string>('CUSTOMER_APP_URL')?.trim(),
      this.config.get<string>('FRONTEND_URL')?.trim(),
      this.config.get<string>('PUBLIC_API_URL')?.trim(),
    ];
    for (const c of candidates) {
      if (!c) continue;
      const safe = this.metaSafeHttpsUrl(c.replace(/\/$/, '') + '/');
      if (safe) return safe;
    }
    return null;
  }

  private metaSafeHttpsUrl(value: string): string | null {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:') return null;
      if (/^(localhost|127\.0\.0\.1)$/i.test(u.hostname)) return null;
      return value;
    } catch {
      return null;
    }
  }
}
