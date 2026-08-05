import { Logger } from '@nestjs/common';
import type {
  WhatsappCatalogProduct,
  WhatsappProvider,
  WhatsappSendInput,
} from './whatsapp.provider';

/** Local / missing-credentials provider — logs only, never fails the order path. */
export class ConsoleWhatsappProvider implements WhatsappProvider {
  private readonly log = new Logger('WhatsappStub');

  async send(input: WhatsappSendInput): Promise<void> {
    this.log.log(
      `[stub] ${input.templateKey} → ${input.toE164} ${JSON.stringify(input.vars)}`,
    );
  }

  async sendText(toE164: string, body: string): Promise<void> {
    this.log.log(`[stub] text → ${toE164}: ${body}`);
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
    this.log.log(
      `[stub] cta_url → ${toE164} header=${opts.headerText ?? opts.headerImageUrl ?? '-'} [${opts.buttonText}] ${opts.url} :: ${opts.bodyText}`,
    );
  }

  async upsertCatalogProducts(products: WhatsappCatalogProduct[]) {
    this.log.log(
      `[stub] catalog upsert ${products.length} products: ${products
        .slice(0, 5)
        .map((p) => p.retailerId)
        .join(', ')}${products.length > 5 ? '…' : ''}`,
    );
    return { attempted: products.length, ok: products.length };
  }

  async deleteCatalogProductsByRetailerIds(retailerIds: string[]) {
    this.log.log(
      `[stub] catalog delete ${retailerIds.length} retailer ids`,
    );
    return { deleted: retailerIds.length };
  }

  async sendCatalogMessage(
    toE164: string,
    opts?: { bodyText?: string; thumbnailRetailerId?: string },
  ): Promise<void> {
    this.log.log(
      `[stub] catalog_message → ${toE164} ${JSON.stringify(opts ?? {})}`,
    );
  }
}
