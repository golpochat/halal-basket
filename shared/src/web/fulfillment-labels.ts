import type { FulfillmentStatus } from '../types';
import { t } from './i18n';

export type StatusTone = 'green' | 'gold' | 'muted' | 'danger' | 'warning';

const STATUS_TONES: Record<FulfillmentStatus, StatusTone> = {
  pending: 'muted',
  preparing: 'warning',
  ready: 'gold',
  out_for_delivery: 'green',
  delivered: 'green',
  failed_attempt: 'warning',
  cancelled: 'danger',
};

const FULFILLMENT_STATUSES = new Set<string>([
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'failed_attempt',
  'cancelled',
]);

const FULFILLMENT_MODES = new Set<string>([
  'pickup',
  'scheduled_delivery',
  'realtime_delivery',
]);

const PAYMENT_STATUSES = new Set(['pending', 'paid', 'failed', 'refunded']);

const ORDER_STATUSES = new Set([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);

function titleCaseWords(raw: string): string {
  return raw
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Prefer explicit lang; otherwise `document.documentElement.lang` from LocaleContext. */
function resolveLang(lang?: string): string {
  if (lang) return lang;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return 'en';
}

export function formatFulfillmentStatus(status: string, lang?: string): string {
  const code = resolveLang(lang);
  if (FULFILLMENT_STATUSES.has(status)) {
    return t(`fulfillment.status.${status}`, code);
  }
  return titleCaseWords(status);
}

export function fulfillmentStatusTone(status: string): StatusTone {
  if (status in STATUS_TONES) {
    return STATUS_TONES[status as FulfillmentStatus];
  }
  return 'muted';
}

export function formatFulfillmentMode(mode: string, lang?: string): string {
  const code = resolveLang(lang);
  if (FULFILLMENT_MODES.has(mode)) {
    return t(`fulfillment.mode.${mode}`, code);
  }
  return titleCaseWords(mode);
}

export function formatPaymentStatus(status: string, lang?: string): string {
  const code = resolveLang(lang);
  if (PAYMENT_STATUSES.has(status)) {
    return t(`payment.status.${status}`, code);
  }
  return titleCaseWords(status);
}

export function formatOrderStatus(status: string, lang?: string): string {
  const code = resolveLang(lang);
  if (ORDER_STATUSES.has(status)) {
    return t(`order.status.${status}`, code);
  }
  return titleCaseWords(status);
}
