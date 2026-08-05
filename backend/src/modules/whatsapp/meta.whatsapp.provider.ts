import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  WhatsappCatalogProduct,
  WhatsappProvider,
  WhatsappSendInput,
  WhatsappTemplateKey,
} from './whatsapp.provider';

/**
 * Meta WhatsApp Cloud API: templates, free text, catalog sync, catalog messages.
 */
export class MetaWhatsappProvider implements WhatsappProvider {
  private readonly log = new Logger('WhatsappMeta');

  constructor(private readonly config: ConfigService) {}

  /** Surface Meta 4xx (e.g. recipient not on allow list) as 400 instead of 500. */
  private throwMetaHttpError(kind: string, status: number, errBody: string): never {
    let detail = errBody.slice(0, 400);
    try {
      const parsed = JSON.parse(errBody) as {
        error?: {
          message?: string;
          code?: number;
          error_data?: { details?: string };
        };
      };
      detail =
        parsed.error?.error_data?.details ||
        parsed.error?.message ||
        detail;
    } catch {
      /* keep truncated body */
    }
    this.log.warn(`Meta WhatsApp ${kind} ${status}: ${detail}`);
    if (status >= 400 && status < 500) {
      throw new BadRequestException(`WhatsApp: ${detail}`);
    }
    throw new Error(`Meta WhatsApp ${kind} ${status}: ${detail}`);
  }

  private creds() {
    const token = this.config.get<string>('WHATSAPP_TOKEN')?.trim();
    const phoneNumberId = this.config
      .get<string>('WHATSAPP_PHONE_NUMBER_ID')
      ?.trim();
    const version =
      this.config.get<string>('WHATSAPP_API_VERSION')?.trim() || 'v21.0';
    if (!token || !phoneNumberId) {
      throw new Error('WhatsApp Meta credentials missing');
    }
    return { token, phoneNumberId, version };
  }

  async send(input: WhatsappSendInput): Promise<void> {
    const { token, phoneNumberId, version } = this.creds();

    const templateName = this.templateName(input.templateKey);
    if (!templateName) {
      this.log.warn(
        `No template name configured for ${input.templateKey}; skipping Meta send`,
      );
      return;
    }

    const params = this.orderedParams(input.templateKey, input.vars);
    const to = input.toE164.replace(/^\+/, '');
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: params.length
            ? [
                {
                  type: 'body',
                  parameters: params.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ]
            : undefined,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.throwMetaHttpError('template', res.status, body);
    }
  }

  async sendText(toE164: string, body: string): Promise<void> {
    const { token, phoneNumberId, version } = this.creds();
    const to = toE164.replace(/^\+/, '');
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.throwMetaHttpError('text', res.status, errBody);
    }
  }

  async sendCtaUrl(
    toE164: string,
    opts: {
      bodyText: string;
      buttonText: string;
      url: string;
      headerText?: string;
      headerImageUrl?: string;
      footerText?: string;
    },
  ): Promise<void> {
    const { token, phoneNumberId, version } = this.creds();
    const to = toE164.replace(/^\+/, '');
    const displayText = opts.buttonText.trim().slice(0, 20) || 'Open';
    const targetUrl = opts.url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      throw new BadRequestException('WhatsApp CTA URL must be http(s)');
    }

    const interactive: Record<string, unknown> = {
      type: 'cta_url',
      body: { text: opts.bodyText.trim().slice(0, 1024) },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: displayText,
          url: targetUrl,
        },
      },
    };

    const imageLink = opts.headerImageUrl?.trim();
    if (imageLink && /^https:\/\//i.test(imageLink)) {
      interactive.header = { type: 'image', image: { link: imageLink } };
    } else if (opts.headerText?.trim()) {
      interactive.header = {
        type: 'text',
        text: opts.headerText.trim().slice(0, 60),
      };
    }

    if (opts.footerText?.trim()) {
      interactive.footer = {
        text: opts.footerText.trim().slice(0, 60),
      };
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.throwMetaHttpError('cta_url', res.status, errBody);
    }
  }

  async upsertCatalogProducts(products: WhatsappCatalogProduct[]) {
    const catalogId = this.config.get<string>('WHATSAPP_CATALOG_ID')?.trim();
    if (!catalogId) {
      this.log.warn(
        `WHATSAPP_CATALOG_ID unset — stub sync of ${products.length} products (no Meta Commerce call)`,
      );
      return { attempted: products.length, ok: 0 };
    }
    const { token, version } = this.creds();
    let ok = 0;
    for (const p of products) {
      const priceCents = Math.round(p.price * 100);
      const url = `https://graph.facebook.com/${version}/${catalogId}/products`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailer_id: p.retailerId,
          name: p.name.slice(0, 200),
          description: (p.description ?? p.name).slice(0, 9999),
          price: `${priceCents}`,
          currency: p.currency || 'EUR',
          availability: 'in stock',
          condition: 'new',
          image_url: p.imageUrl || undefined,
          url: p.url || undefined,
        }),
      });
      if (res.ok) {
        ok += 1;
      } else {
        const errBody = await res.text().catch(() => '');
        this.log.warn(
          `Catalog upsert ${p.retailerId} failed ${res.status}: ${errBody.slice(0, 200)}`,
        );
      }
    }

    try {
      const { phoneNumberId } = this.creds();
      await fetch(
        `https://graph.facebook.com/${version}/${phoneNumberId}/whatsapp_commerce_settings?is_cart_enabled=true&is_catalog_visible=true`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (err) {
      this.log.warn(
        `Commerce settings update failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { attempted: products.length, ok };
  }

  async deleteCatalogProductsByRetailerIds(retailerIds: string[]) {
    const catalogId = this.config.get<string>('WHATSAPP_CATALOG_ID')?.trim();
    if (!catalogId || retailerIds.length === 0) {
      return { deleted: 0 };
    }
    const wanted = new Set(retailerIds);
    const { token, version } = this.creds();
    let deleted = 0;
    let url: string | null =
      `https://graph.facebook.com/${version}/${catalogId}/products` +
      `?fields=id,retailer_id&limit=100`;

    while (url && wanted.size > 0) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        this.log.warn(
          `Catalog list for prune failed ${res.status}: ${errBody.slice(0, 200)}`,
        );
        break;
      }
      const json = (await res.json()) as {
        data?: Array<{ id: string; retailer_id?: string }>;
        paging?: { next?: string };
      };
      for (const item of json.data ?? []) {
        const rid = item.retailer_id;
        if (!rid || !wanted.has(rid)) continue;
        const del = await fetch(
          `https://graph.facebook.com/${version}/${item.id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (del.ok) {
          deleted += 1;
          wanted.delete(rid);
        } else {
          const errBody = await del.text().catch(() => '');
          this.log.warn(
            `Catalog delete ${rid} failed ${del.status}: ${errBody.slice(0, 160)}`,
          );
        }
      }
      url = json.paging?.next ?? null;
    }

    return { deleted };
  }

  async sendCatalogMessage(
    toE164: string,
    opts?: { bodyText?: string; thumbnailRetailerId?: string },
  ): Promise<void> {
    const { token, phoneNumberId, version } = this.creds();
    const to = toE164.replace(/^\+/, '');
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const action: Record<string, unknown> = {
      name: 'catalog_message',
    };
    if (opts?.thumbnailRetailerId) {
      action.parameters = {
        thumbnail_product_retailer_id: opts.thumbnailRetailerId,
      };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'catalog_message',
          body: {
            text:
              opts?.bodyText?.trim() ||
              'Browse Halal Basket and add items to your cart.',
          },
          action,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.throwMetaHttpError('catalog message', res.status, errBody);
    }
  }

  private templateName(key: WhatsappTemplateKey): string | null {
    const map: Record<WhatsappTemplateKey, string | undefined> = {
      order_placed_pay: this.config.get<string>('WHATSAPP_TEMPLATE_ORDER_PLACED'),
      payment_received: this.config.get<string>(
        'WHATSAPP_TEMPLATE_PAYMENT_RECEIVED',
      ),
      fulfillment_update: this.config.get<string>(
        'WHATSAPP_TEMPLATE_FULFILLMENT',
      ),
    };
    const name = map[key]?.trim();
    return name || null;
  }

  private orderedParams(
    key: WhatsappTemplateKey,
    vars: Record<string, string>,
  ): string[] {
    switch (key) {
      case 'order_placed_pay':
        return [vars.orderRef, vars.total, vars.payUrl].filter(Boolean);
      case 'payment_received':
        return [vars.orderRef].filter(Boolean);
      case 'fulfillment_update':
        return [vars.orderRef, vars.status, vars.detail ?? ''].filter(
          (v, i, a) => v !== '' || i < a.length - 1,
        );
      default:
        return Object.values(vars);
    }
  }
}
