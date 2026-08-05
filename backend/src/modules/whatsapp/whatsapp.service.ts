import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeE164 } from './phone';
import {
  WHATSAPP_PROVIDER,
  type WhatsappProvider,
  type WhatsappTemplateKey,
} from './whatsapp.provider';

@Injectable()
export class WhatsappService {
  private readonly log = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsappProvider,
  ) {}

  customerAppBase(): string {
    return (
      this.config.get<string>('CUSTOMER_APP_URL')?.replace(/\/$/, '') ||
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:5173'
    );
  }

  orderRef(orderId: string): string {
    return orderId.slice(0, 8).toUpperCase();
  }

  /** Fire-and-forget; never throws to callers. */
  notifySafe(
    fn: () => Promise<void>,
    context: string,
  ): void {
    void fn().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`WhatsApp ${context} failed: ${msg}`);
    });
  }

  async sendToCustomer(
    customerId: string,
    templateKey: WhatsappTemplateKey,
    vars: Record<string, string>,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: { select: { phone: true } } },
    });
    if (!customer?.whatsappOptIn) return;
    const toE164 = normalizeE164(customer.user.phone);
    if (!toE164) {
      this.log.warn(
        `Skip ${templateKey}: customer ${customerId} opted in but phone missing/invalid`,
      );
      return;
    }
    await this.provider.send({ toE164, templateKey, vars });
  }

  async notifyOrderPlaced(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
      },
    });
    if (!order) return;
    const payUrl = `${this.customerAppBase()}/orders/${order.id}/confirmation`;
    await this.sendToCustomer(order.customerId, 'order_placed_pay', {
      orderRef: this.orderRef(order.id),
      total: `€${Number(order.totalAmount).toFixed(2)}`,
      payUrl,
    });
  }

  async notifyPaymentReceived(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true },
    });
    if (!order) return;
    await this.sendToCustomer(order.customerId, 'payment_received', {
      orderRef: this.orderRef(order.id),
    });
  }

  async notifyFulfillmentUpdate(
    orderId: string,
    statusLabel: string,
    detail?: string,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true },
    });
    if (!order) return;
    await this.sendToCustomer(order.customerId, 'fulfillment_update', {
      orderRef: this.orderRef(order.id),
      status: statusLabel,
      detail: detail ?? '',
    });
  }
}
