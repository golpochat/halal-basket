import { t } from './i18n';

export type DriverFeedbackTagOption = {
  value: string;
  label: string;
};

/**
 * Canonical driver feedback tags (stored keys).
 * Risk/stock engines key off some of these (`item_missing`, `rude`, `frequent_refunder`).
 */
export const DRIVER_FEEDBACK_TAG_VALUES = [
  'item_missing',
  'late',
  'rude',
  'wrong_address',
  'customer_unavailable',
  'damaged_item',
  'no_answer',
  'frequent_refunder',
] as const;

function resolveLang(lang?: string): string {
  if (lang) return lang;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return 'en';
}

/** English snapshot for static imports; prefer `driverFeedbackTagOptions()`. */
export const DRIVER_FEEDBACK_TAGS: DriverFeedbackTagOption[] =
  driverFeedbackTagOptions('en');

export function driverFeedbackTagOptions(
  lang?: string,
): DriverFeedbackTagOption[] {
  const code = resolveLang(lang);
  return DRIVER_FEEDBACK_TAG_VALUES.map((value) => ({
    value,
    label: t(`feedback.${value}`, code),
  }));
}

export function formatDriverFeedbackTag(value: string, lang?: string): string {
  const code = resolveLang(lang);
  if ((DRIVER_FEEDBACK_TAG_VALUES as readonly string[]).includes(value)) {
    return t(`feedback.${value}`, code);
  }
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse free-form custom tags; keep snake_case for known-looking tokens. */
export function parseCustomFeedbackTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) =>
      /^[a-z0-9]+(_[a-z0-9]+)*$/i.test(tag)
        ? tag.toLowerCase()
        : tag
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, ''),
    )
    .filter(Boolean);
}
