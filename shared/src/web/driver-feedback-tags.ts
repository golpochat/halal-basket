export type DriverFeedbackTagOption = {
  value: string;
  label: string;
};

/**
 * Canonical driver feedback tags (stored keys).
 * Risk/stock engines key off some of these (`item_missing`, `rude`, `frequent_refunder`).
 */
export const DRIVER_FEEDBACK_TAGS: DriverFeedbackTagOption[] = [
  { value: 'item_missing', label: 'Item missing' },
  { value: 'late', label: 'Late' },
  { value: 'rude', label: 'Rude' },
  { value: 'wrong_address', label: 'Wrong address' },
  { value: 'customer_unavailable', label: 'Customer unavailable' },
  { value: 'damaged_item', label: 'Damaged item' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'frequent_refunder', label: 'Frequent refunder' },
];

export function formatDriverFeedbackTag(value: string): string {
  const known = DRIVER_FEEDBACK_TAGS.find((t) => t.value === value);
  if (known) return known.label;
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse free-form custom tags; keep snake_case for known-looking tokens. */
export function parseCustomFeedbackTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) =>
      /^[a-z0-9]+(_[a-z0-9]+)*$/i.test(t)
        ? t.toLowerCase()
        : t
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, ''),
    )
    .filter(Boolean);
}
