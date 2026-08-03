import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  provider(): 'mock' | 'stripe' {
    const p = (this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock').toLowerCase();
    return p === 'stripe' ? 'stripe' : 'mock';
  }

  getPublicConfig() {
    return {
      provider: this.provider(),
      publishableKey:
        this.provider() === 'stripe'
          ? (this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? null)
          : null,
    };
  }

  private frontendBase() {
    return (
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      this.config.get<string>('CORS_ORIGINS')?.split(',')[0]?.trim() ||
      'http://localhost:5173'
    );
  }

  async createIntent(orderId: string, actorUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.paid) {
      throw new BadRequestException('Order already paid');
    }

    if (this.provider() === 'stripe') {
      const key = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!key) {
        throw new BadRequestException('STRIPE_SECRET_KEY not configured');
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Stripe = require('stripe');
      const stripe = new Stripe(key);
      const base = this.frontendBase();
      const amountCents = Math.round(Number(order.totalAmount) * 100);
      if (amountCents < 50) {
        throw new BadRequestException('Order total too low for Stripe Checkout');
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${base}/orders/${order.id}/confirmation?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/orders/${order.id}/confirmation?paid=0`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: amountCents,
              product_data: {
                name: 'Halal Basket order',
                description: `Order ${order.id.slice(0, 8)}…`,
              },
            },
          },
        ],
        metadata: { orderId: order.id },
        payment_intent_data: {
          metadata: { orderId: order.id },
        },
      });

      if (!session.url) {
        throw new BadRequestException('Stripe Checkout session missing URL');
      }

      await this.audit.log({
        actorUserId,
        action: 'payment.checkout_session_created',
        entityType: 'order',
        entityId: orderId,
        payload: {
          provider: 'stripe',
          sessionId: session.id,
          paymentIntentId: session.payment_intent ?? null,
        },
      });

      return {
        provider: 'stripe' as const,
        checkoutUrl: session.url,
        sessionId: session.id,
        amount: Number(order.totalAmount),
        currency: 'eur',
      };
    }

    const mockId = `mock_pi_${randomUUID()}`;
    await this.audit.log({
      actorUserId,
      action: 'payment.intent_created',
      entityType: 'order',
      entityId: orderId,
      payload: { provider: 'mock', paymentIntentId: mockId },
    });
    return {
      provider: 'mock' as const,
      clientSecret: `${mockId}_secret`,
      paymentIntentId: mockId,
      amount: Number(order.totalAmount),
      currency: 'eur',
    };
  }

  /** Mock confirm — never use in production; Stripe uses webhooks + return sync. */
  async confirmMock(orderId: string, actorUserId: string, paymentIntentId: string) {
    if (this.provider() !== 'mock') {
      throw new BadRequestException('Mock confirm only when PAYMENT_PROVIDER=mock');
    }
    return this.markPaid(orderId, actorUserId, {
      provider: 'mock',
      paymentIntentId,
    });
  }

  /**
   * After Checkout redirect (`?paid=1`), verify the session with Stripe and mark paid.
   * Complements webhooks so local/dev still works without `stripe listen`.
   */
  async confirmStripeReturn(
    orderId: string,
    actorUserId: string,
    sessionId?: string,
  ) {
    if (this.provider() !== 'stripe') {
      throw new BadRequestException('Stripe confirm only when PAYMENT_PROVIDER=stripe');
    }
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new BadRequestException('STRIPE_SECRET_KEY not configured');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    const stripe = new Stripe(key);

    type SessionLike = {
      id: string;
      payment_status?: string | null;
      status?: string | null;
      payment_intent?: string | null;
      metadata?: { orderId?: string } | null;
    };

    let session: SessionLike | undefined;
    if (sessionId) {
      session = (await stripe.checkout.sessions.retrieve(
        sessionId,
      )) as SessionLike;
    } else {
      const listed = await stripe.checkout.sessions.list({ limit: 40 });
      session = (listed.data as SessionLike[]).find(
        (s) =>
          s.metadata?.orderId === orderId &&
          (s.payment_status === 'paid' || s.status === 'complete'),
      );
    }

    if (!session) {
      throw new BadRequestException('No matching Stripe Checkout session found');
    }
    if (session.metadata?.orderId !== orderId) {
      throw new BadRequestException('Checkout session does not match this order');
    }
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new BadRequestException('Stripe payment is not completed yet');
    }

    return this.markPaid(orderId, actorUserId, {
      provider: 'stripe',
      paymentIntentId: String(session.payment_intent ?? session.id),
    });
  }

  async markPaid(
    orderId: string,
    actorUserId: string | undefined,
    meta: { provider: string; paymentIntentId: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.paid) {
      return order;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.paid },
    });

    await this.audit.log({
      actorUserId,
      action: 'payment.paid',
      entityType: 'order',
      entityId: orderId,
      payload: meta,
    });

    return updated;
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!key || !secret) {
      throw new BadRequestException('Stripe webhook not configured');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    const stripe = new Stripe(key);
    const event = stripe.webhooks.constructEvent(rawBody, signature ?? '', secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        payment_intent?: string | null;
        metadata?: { orderId?: string };
      };
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.markPaid(orderId, undefined, {
          provider: 'stripe',
          paymentIntentId: String(session.payment_intent ?? session.id),
        });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as {
        id: string;
        metadata?: { orderId?: string };
      };
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await this.markPaid(orderId, undefined, {
          provider: 'stripe',
          paymentIntentId: intent.id,
        });
      }
    }

    return { received: true };
  }
}
