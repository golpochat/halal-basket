export type DeliveryAttemptReasonOption = {
  value: string;
  label: string;
};

/** Required reasons when a driver cannot complete a delivery stop. */
export const DELIVERY_ATTEMPT_REASONS: DeliveryAttemptReasonOption[] = [
  { value: 'not_at_home', label: 'Not at home' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'wrong_address', label: 'Wrong address' },
  { value: 'customer_refused', label: 'Customer refused' },
  { value: 'access_issue', label: 'Access / gate issue' },
  { value: 'unsafe_to_deliver', label: 'Unsafe to deliver' },
  { value: 'other', label: 'Other' },
];

export function formatDeliveryAttemptReason(value: string): string {
  const known = DELIVERY_ATTEMPT_REASONS.find((r) => r.value === value);
  if (known) return known.label;
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
