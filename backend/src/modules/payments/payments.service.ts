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
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(Number(order.totalAmount) * 100),
        currency: 'eur',
        metadata: { orderId: order.id },
        automatic_payment_methods: { enabled: true },
      });
      await this.audit.log({
        actorUserId,
        action: 'payment.intent_created',
        entityType: 'order',
        entityId: orderId,
        payload: { provider: 'stripe', paymentIntentId: intent.id },
      });
      return {
        provider: 'stripe' as const,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
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

  /** Mock confirm — never use in production; Stripe uses webhooks. */
  async confirmMock(orderId: string, actorUserId: string, paymentIntentId: string) {
    if (this.provider() !== 'mock') {
      throw new BadRequestException('Mock confirm only when PAYMENT_PROVIDER=mock');
    }
    return this.markPaid(orderId, actorUserId, {
      provider: 'mock',
      paymentIntentId,
    });
  }

  async markPaid(
    orderId: string,
    actorUserId: string | undefined,
    meta: { provider: string; paymentIntentId: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

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
