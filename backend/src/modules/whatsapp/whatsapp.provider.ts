export type WhatsappTemplateKey =
  | 'order_placed_pay'
  | 'payment_received'
  | 'fulfillment_update';

export type WhatsappSendInput = {
  toE164: string;
  templateKey: WhatsappTemplateKey;
  vars: Record<string, string>;
};

export type WhatsappCatalogProduct = {
  retailerId: string;
  name: string;
  description?: string;
  /** Unit price in major currency units (e.g. 12.5 for €12.50). */
  price: number;
  currency: string;
  imageUrl?: string | null;
  url?: string;
};

export interface WhatsappProvider {
  send(input: WhatsappSendInput): Promise<void>;
  /** Free-form text (agent reply / keyword bot within Meta 24h window). */
  sendText(toE164: string, body: string): Promise<void>;
  /**
   * Interactive CTA URL button (tappable “Pay now” / “Open shop”).
   * Prefer this over pasting raw URLs into text (WhatsApp often won’t linkify localhost / plain strings).
   */
  sendCtaUrl(
    toE164: string,
    opts: {
      bodyText: string;
      buttonText: string;
      url: string;
      headerText?: string;
      headerImageUrl?: string;
      footerText?: string;
    },
  ): Promise<void>;
  /** Upsert products into Meta Commerce catalog (no-op / log in stub). */
  upsertCatalogProducts(products: WhatsappCatalogProduct[]): Promise<{
    attempted: number;
    ok: number;
  }>;
  /**
   * Remove catalog rows by retailer_id (our product UUID).
   * Used to prune Meta-blocked meat/fish/eggs after policy filter changes.
   */
  deleteCatalogProductsByRetailerIds(retailerIds: string[]): Promise<{
    deleted: number;
  }>;
  /** Interactive catalog message (falls back to text in stub). */
  sendCatalogMessage(
    toE164: string,
    opts?: { bodyText?: string; thumbnailRetailerId?: string },
  ): Promise<void>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
