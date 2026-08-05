import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeE164 } from './phone';
import {
  WHATSAPP_PROVIDER,
  type WhatsappProvider,
} from './whatsapp.provider';
import { WhatsappCommerceService } from './whatsapp-commerce.service';
import { WhatsappService } from './whatsapp.service';

type MetaWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
          order?: {
            catalog_id?: string;
            text?: string;
            product_items?: Array<{
              product_retailer_id?: string;
              quantity?: number;
              item_price?: number;
              currency?: string;
            }>;
          };
        }>;
      };
    }>;
  }>;
};

type WaAssistJwt = {
  typ: 'wa_assist';
  tid: string;
  phone: string;
  cid?: string;
};

const ASSIST_TTL_SEC = 2 * 60 * 60;

@Injectable()
export class WhatsappInboxService {
  private readonly log = new Logger(WhatsappInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsappService,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly commerce: WhatsappCommerceService,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsappProvider,
  ) {}

  metaConfigured(): boolean {
    const token = this.config.get<string>('WHATSAPP_TOKEN')?.trim();
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim();
    return Boolean(token && phoneId);
  }

  verifyWebhook(mode?: string, token?: string, challenge?: string): string | null {
    const expected = this.config.get<string>('WHATSAPP_VERIFY_TOKEN')?.trim();
    if (!expected) return null;
    if (mode === 'subscribe' && token === expected && challenge) {
      return challenge;
    }
    return null;
  }

  async handleMetaWebhook(body: MetaWebhookBody): Promise<{ ok: true }> {
    if (body.object !== 'whatsapp_business_account') {
      return { ok: true };
    }
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          if (!msg.from) continue;
          const phone = normalizeE164(
            msg.from.startsWith('+') ? msg.from : `+${msg.from}`,
          );
          if (!phone) {
            this.log.warn(`Skip inbound: invalid from ${msg.from}`);
            continue;
          }

          if (msg.type === 'order' && msg.order?.product_items?.length) {
            try {
              await this.commerce.handleCommerceCart({
                phoneE164: phone,
                catalogId: msg.order.catalog_id ?? null,
                providerMessageId: msg.id ?? null,
                items: msg.order.product_items.map((p) => ({
                  productId: String(p.product_retailer_id ?? ''),
                  quantity: Number(p.quantity) || 1,
                })),
              });
            } catch (err) {
              this.log.warn(
                `Commerce webhook failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
            continue;
          }

          if (msg.type && msg.type !== 'text') continue;
          const text = msg.text?.body?.trim();
          if (!text) continue;
          await this.ingestInbound({
            phoneE164: phone,
            body: text,
            providerMessageId: msg.id ?? null,
          });
        }
      }
    }
    return { ok: true };
  }

  async ingestInbound(input: {
    phoneE164: string;
    body: string;
    providerMessageId?: string | null;
  }) {
    const phoneE164 = normalizeE164(input.phoneE164);
    if (!phoneE164) {
      throw new BadRequestException('Invalid phone (use E.164, e.g. +353…)');
    }
    const body = input.body.trim();
    if (!body) throw new BadRequestException('Message body required');

    const customerId = await this.findCustomerIdByPhone(phoneE164);
    const thread = await this.upsertOpenThread(phoneE164, customerId);

    if (input.providerMessageId) {
      const dup = await this.prisma.whatsappMessage.findFirst({
        where: { providerMessageId: input.providerMessageId },
        select: { id: true },
      });
      if (dup) {
        return { threadId: thread.id, messageId: dup.id, autoReplied: false };
      }
    }

    const inbound = await this.prisma.whatsappMessage.create({
      data: {
        threadId: thread.id,
        direction: 'inbound',
        body,
        providerMessageId: input.providerMessageId ?? null,
      },
    });

    const needsAssistance = this.isAssistRequest(body);
    await this.prisma.whatsappThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        status: 'open',
        ...(customerId && !thread.customerId ? { customerId } : {}),
        ...(needsAssistance ? { needsAssistance: true } : {}),
      },
    });

    const upper = body.toUpperCase();
    if (upper === 'CATALOG' || upper.startsWith('CATALOG ')) {
      try {
        const result = await this.commerce.sendCatalogToPhone(phoneE164);
        const note =
          result.mode === 'catalog_message'
            ? '[catalog message sent]'
            : '[catalog unavailable — shop link sent]';
        await this.prisma.whatsappMessage.create({
          data: {
            threadId: thread.id,
            direction: 'outbound',
            body: note,
          },
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'send failed';
        this.log.warn(`CATALOG auto-reply failed for ${phoneE164}: ${detail}`);
        await this.prisma.whatsappMessage.create({
          data: {
            threadId: thread.id,
            direction: 'outbound',
            body: `[catalog send failed — inbound kept] ${detail}`,
          },
        });
      }
      await this.prisma.whatsappThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() },
      });
      return {
        threadId: thread.id,
        messageId: inbound.id,
        autoReplied: true,
        needsAssistance,
      };
    }

    const autoReply = await this.maybeAutoReply(customerId, body);
    if (autoReply) {
      try {
        await this.sendAndStoreOutbound(thread.id, phoneE164, autoReply, {
          clearAssistance: false,
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'send failed';
        this.log.warn(`Keyword auto-reply failed for ${phoneE164}: ${detail}`);
        await this.prisma.whatsappMessage.create({
          data: {
            threadId: thread.id,
            direction: 'outbound',
            body: `[auto-reply not delivered] ${detail}\n---\n${autoReply}`,
          },
        });
        await this.prisma.whatsappThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: new Date() },
        });
      }
    }

    return {
      threadId: thread.id,
      messageId: inbound.id,
      autoReplied: Boolean(autoReply),
      needsAssistance,
    };
  }

  async listThreads(opts?: {
    status?: 'open' | 'closed';
    needsAssistance?: boolean;
  }) {
    const where: Prisma.WhatsappThreadWhereInput = {};
    if (opts?.status) where.status = opts.status;
    if (opts?.needsAssistance === true) where.needsAssistance = true;

    const rows = await this.prisma.whatsappThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, direction: true, createdAt: true },
        },
      },
    });

    return rows.map((t) => ({
      id: t.id,
      phoneE164: t.phoneE164,
      status: t.status,
      needsAssistance: t.needsAssistance,
      lastMessageAt: t.lastMessageAt,
      customer: t.customer
        ? {
            id: t.customer.id,
            name: t.customer.name,
            email: t.customer.user.email,
          }
        : null,
      lastMessage: t.messages[0]
        ? {
            body: t.messages[0].body,
            direction: t.messages[0].direction,
            createdAt: t.messages[0].createdAt,
          }
        : null,
    }));
  }

  async getThread(threadId: string) {
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true, phone: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    let recentOrders: Array<{
      id: string;
      ref: string;
      status: string;
      paymentStatus: string;
      totalAmount: string;
      createdAt: Date;
    }> = [];

    if (thread.customerId) {
      const orders = await this.prisma.order.findMany({
        where: { customerId: thread.customerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
        },
      });
      recentOrders = orders.map((o) => ({
        id: o.id,
        ref: this.whatsapp.orderRef(o.id),
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmount: String(o.totalAmount),
        createdAt: o.createdAt,
      }));
    }

    return {
      id: thread.id,
      phoneE164: thread.phoneE164,
      status: thread.status,
      needsAssistance: thread.needsAssistance,
      pendingCommerce: thread.pendingCommerceJson ?? null,
      lastMessageAt: thread.lastMessageAt,
      customer: thread.customer
        ? {
            id: thread.customer.id,
            name: thread.customer.name,
            email: thread.customer.user.email,
            phone: thread.customer.user.phone,
          }
        : null,
      recentOrders,
      messages: thread.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        providerMessageId: m.providerMessageId,
        createdAt: m.createdAt,
      })),
    };
  }

  async reply(threadId: string, bodyRaw: string) {
    const body = bodyRaw.trim();
    if (!body) throw new BadRequestException('Reply body required');

    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    await this.sendAndStoreOutbound(thread.id, thread.phoneE164, body, {
      clearAssistance: true,
    });
    return this.getThread(threadId);
  }

  async closeThread(threadId: string) {
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    await this.prisma.whatsappThread.update({
      where: { id: threadId },
      data: { status: 'closed', needsAssistance: false },
    });
    return this.getThread(threadId);
  }

  /** Build assist deep-link URL (JWT, ~2h). Does not send WhatsApp. */
  async createAssistLink(threadId: string) {
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    const token = this.jwt.sign(
      {
        typ: 'wa_assist',
        tid: thread.id,
        phone: thread.phoneE164,
        ...(thread.customerId ? { cid: thread.customerId } : {}),
      } satisfies WaAssistJwt,
      { expiresIn: ASSIST_TTL_SEC },
    );

    const url = `${this.whatsapp.customerAppBase()}/?wa_assist=${encodeURIComponent(token)}`;
    return {
      url,
      expiresInSec: ASSIST_TTL_SEC,
      threadId: thread.id,
      customerId: thread.customerId,
    };
  }

  /** Create assist link, send via WhatsApp, clear needsAssistance. */
  async sendAssistLink(threadId: string) {
    const link = await this.createAssistLink(threadId);
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    const body = [
      'Continue your Halal Basket order here (link expires in 2 hours):',
      link.url,
      'Browse the catalogue, checkout, and pay securely in the app.',
    ].join('\n');

    await this.sendAndStoreOutbound(thread.id, thread.phoneE164, body, {
      clearAssistance: true,
    });
    return { ...link, thread: await this.getThread(threadId) };
  }

  /** Shop deep link only (no JWT). */
  async sendShopLink(threadId: string) {
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    const url = `${this.whatsapp.customerAppBase()}/`;
    const body = `Shop Halal Basket here: ${url}`;
    await this.sendAndStoreOutbound(thread.id, thread.phoneE164, body, {
      clearAssistance: true,
    });
    return this.getThread(threadId);
  }

  /** Public: validate assist JWT; issue customer session when phone is linked. */
  async redeemAssistToken(token: string) {
    let payload: WaAssistJwt;
    try {
      payload = this.jwt.verify<WaAssistJwt>(token);
    } catch {
      throw new UnauthorizedException('Assist link invalid or expired');
    }
    if (payload.typ !== 'wa_assist' || !payload.tid || !payload.phone) {
      throw new UnauthorizedException('Assist link invalid');
    }

    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: payload.tid },
      select: { id: true, phoneE164: true, customerId: true },
    });
    if (!thread || thread.phoneE164 !== payload.phone) {
      throw new UnauthorizedException('Assist link invalid');
    }

    let session: Awaited<
      ReturnType<AuthService['issueSessionForUserId']>
    > | null = null;

    const customerId = payload.cid ?? thread.customerId;
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { userId: true },
      });
      if (customer) {
        session = await this.auth.issueSessionForUserId(customer.userId);
      }
    }

    return {
      ok: true as const,
      threadId: thread.id,
      customerId: customerId ?? null,
      message: session
        ? 'Continue your WhatsApp order'
        : 'Continue shopping — sign in to checkout with your account',
      session,
    };
  }

  private async sendAndStoreOutbound(
    threadId: string,
    phoneE164: string,
    body: string,
    opts?: { clearAssistance?: boolean },
  ) {
    await this.provider.sendText(phoneE164, body);
    await this.prisma.whatsappMessage.create({
      data: {
        threadId,
        direction: 'outbound',
        body,
      },
    });
    await this.prisma.whatsappThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        status: 'open',
        ...(opts?.clearAssistance ? { needsAssistance: false } : {}),
      },
    });
  }

  private async upsertOpenThread(phoneE164: string, customerId: string | null) {
    const existing = await this.prisma.whatsappThread.findUnique({
      where: { phoneE164 },
    });
    if (existing) {
      if (customerId && !existing.customerId) {
        return this.prisma.whatsappThread.update({
          where: { id: existing.id },
          data: { customerId, status: 'open' },
        });
      }
      if (existing.status === 'closed') {
        return this.prisma.whatsappThread.update({
          where: { id: existing.id },
          data: { status: 'open' },
        });
      }
      return existing;
    }
    return this.prisma.whatsappThread.create({
      data: {
        phoneE164,
        customerId,
        status: 'open',
      },
    });
  }

  private async findCustomerIdByPhone(phoneE164: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { phone: phoneE164 },
      select: { customer: { select: { id: true } } },
    });
    return user?.customer?.id ?? null;
  }

  /** LIST keyword or free-text shopping request (not a known command). */
  private isAssistRequest(body: string): boolean {
    const text = body.trim();
    const upper = text.toUpperCase();
    if (upper === 'LIST' || upper.startsWith('LIST ')) return true;
    if (this.isKnownKeyword(text)) return false;
    // Short greetings / acknowledgements — do not escalate
    if (text.length < 12) return false;
    if (/^(hi|hello|hey|thanks|thank you|ok|okay)\b/i.test(text)) return false;
    return true;
  }

  private isKnownKeyword(body: string): boolean {
    const text = body.trim();
    const upper = text.toUpperCase();
    if (upper === 'HELP' || upper.startsWith('HELP ')) return true;
    if (upper === 'ORDER' || upper === 'SHOP') return true;
    if (upper.startsWith('ORDER ') || upper.startsWith('SHOP ')) return true;
    if (upper === 'CATALOG' || upper.startsWith('CATALOG ')) return true;
    if (/^STATUS(?:\s+[A-Za-z0-9-]+)?$/i.test(text)) return true;
    if (/^PAY(?:\s+[A-Za-z0-9-]+)?$/i.test(text)) return true;
    if (upper === 'LIST' || upper.startsWith('LIST ')) return true;
    return false;
  }

  private async maybeAutoReply(
    customerId: string | null,
    body: string,
  ): Promise<string | null> {
    const text = body.trim();
    const upper = text.toUpperCase();
    const base = this.whatsapp.customerAppBase();

    if (upper === 'HELP' || upper.startsWith('HELP ')) {
      return [
        'Halal Basket care — reply with:',
        '- STATUS — latest order',
        '- STATUS <ref> — order by short ref (first 8 chars)',
        '- PAY — pay link for unpaid order',
        '- ORDER or SHOP — open the store',
        '- CATALOG — browse WhatsApp catalog / cart',
        '- LIST — ask a teammate to help build your basket',
        `FAQ: ${base}/faq`,
        'Or send your shopping list in plain text.',
      ].join('\n');
    }

    if (
      upper === 'ORDER' ||
      upper === 'SHOP' ||
      upper.startsWith('ORDER ') ||
      upper.startsWith('SHOP ')
    ) {
      return `Shop Halal Basket here: ${base}/`;
    }

    if (upper === 'LIST' || upper.startsWith('LIST ')) {
      return [
        'Thanks — a teammate will help build your basket.',
        'We will send a secure shop link shortly.',
        `Or browse yourself: ${base}/`,
        'Reply HELP for other options.',
      ].join('\n');
    }

    const payMatch = /^PAY(?:\s+([A-Za-z0-9-]+))?$/i.exec(text);
    if (payMatch) {
      return this.buildPayReply(customerId, payMatch[1] ?? null, base);
    }

    const statusMatch = /^STATUS(?:\s+([A-Za-z0-9-]+))?$/i.exec(text);
    if (statusMatch) {
      return this.buildStatusReply(customerId, statusMatch[1] ?? null, base);
    }

    if (this.isAssistRequest(text)) {
      return [
        'Got your message. A teammate will help with your list.',
        'We will send a secure shop link shortly.',
        `Or browse yourself: ${base}/`,
        'Reply HELP for STATUS / PAY / ORDER.',
      ].join('\n');
    }

    return null;
  }

  private async buildPayReply(
    customerId: string | null,
    refRaw: string | null,
    base: string,
  ): Promise<string> {
    if (!customerId) {
      return [
        'We could not match this WhatsApp number to an account.',
        `Update your phone in Profile: ${base}/customer/profile`,
        'Or reply HELP for options.',
      ].join('\n');
    }

    const unpaid = await this.findCustomerOrder(customerId, refRaw, {
      paymentStatus: 'pending',
    });
    if (!unpaid) {
      return [
        'No unpaid order found for this number.',
        `Track orders: ${base}/customer/orders`,
        `Shop: ${base}/`,
      ].join('\n');
    }

    const ref = this.whatsapp.orderRef(unpaid.id);
    return [
      `Order ${ref} is waiting for payment (€${Number(unpaid.totalAmount).toFixed(2)}).`,
      `Pay securely: ${base}/orders/${unpaid.id}/confirmation`,
    ].join('\n');
  }

  private async buildStatusReply(
    customerId: string | null,
    refRaw: string | null,
    base: string,
  ): Promise<string> {
    if (!customerId) {
      return [
        'We could not match this WhatsApp number to an account.',
        `Sign in or update your phone in Profile: ${base}/customer/profile`,
        'Or reply HELP for options.',
      ].join('\n');
    }

    const order = await this.findCustomerOrder(customerId, refRaw);
    if (!order) {
      return `No orders yet. Start shopping: ${base}/`;
    }

    const ref = this.whatsapp.orderRef(order.id);
    const fulfill = order.fulfillments
      .map((f) => String(f.status).replaceAll('_', ' '))
      .join(', ');
    const payHint =
      order.paymentStatus === 'pending'
        ? `Pay: ${base}/orders/${order.id}/confirmation`
        : `Track: ${base}/customer/orders/${order.id}`;

    return [
      `Order ${ref}`,
      `Order status: ${order.status}`,
      `Payment: ${order.paymentStatus}`,
      fulfill ? `Fulfillment: ${fulfill}` : null,
      `Total: €${Number(order.totalAmount).toFixed(2)}`,
      payHint,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async findCustomerOrder(
    customerId: string,
    refRaw: string | null,
    extraWhere?: { paymentStatus?: 'pending' },
  ) {
    type OrderRow = {
      id: string;
      status: string;
      paymentStatus: string;
      totalAmount: Prisma.Decimal;
      fulfillments: Array<{ status: string }>;
    };

    const whereBase: Prisma.OrderWhereInput = {
      customerId,
      ...(extraWhere?.paymentStatus
        ? { paymentStatus: extraWhere.paymentStatus }
        : {}),
    };

    let order: OrderRow | null = null;

    if (refRaw) {
      const needle = refRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (needle.length >= 4) {
        const candidates = await this.prisma.order.findMany({
          where: whereBase,
          orderBy: { createdAt: 'desc' },
          take: 40,
          include: {
            fulfillments: { select: { status: true }, take: 3 },
          },
        });
        order =
          candidates.find((o) =>
            o.id.replace(/-/g, '').toLowerCase().startsWith(needle),
          ) ?? null;
      }
    }

    if (!order) {
      order = await this.prisma.order.findFirst({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        include: {
          fulfillments: { select: { status: true }, take: 3 },
        },
      });
    }

    return order;
  }
}
