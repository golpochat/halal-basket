import { t } from './i18n';

export type DeliveryAttemptReasonOption = {
  value: string;
  label: string;
};

/** Required reasons when a driver cannot complete a delivery stop. */
export const DELIVERY_ATTEMPT_REASON_VALUES = [
  'not_at_home',
  'no_answer',
  'wrong_address',
  'customer_refused',
  'access_issue',
  'unsafe_to_deliver',
  'other',
] as const;

function resolveLang(lang?: string): string {
  if (lang) return lang;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return 'en';
}

/** English snapshot for static imports; prefer `deliveryAttemptReasonOptions()`. */
export const DELIVERY_ATTEMPT_REASONS: DeliveryAttemptReasonOption[] =
  deliveryAttemptReasonOptions('en');

export function deliveryAttemptReasonOptions(
  lang?: string,
): DeliveryAttemptReasonOption[] {
  const code = resolveLang(lang);
  return DELIVERY_ATTEMPT_REASON_VALUES.map((value) => ({
    value,
    label: t(`attempt.${value}`, code),
  }));
}

export function formatDeliveryAttemptReason(
  value: string,
  lang?: string,
): string {
  const code = resolveLang(lang);
  if ((DELIVERY_ATTEMPT_REASON_VALUES as readonly string[]).includes(value)) {
    return t(`attempt.${value}`, code);
  }
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
