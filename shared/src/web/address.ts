/** Predefined address labels for customer saved addresses. */
export const ADDRESS_LABELS = ['Home', 'Work', 'Family', 'Other'] as const;

export type AddressLabel = (typeof ADDRESS_LABELS)[number];

/** Irish Eircode: A65 F4E2 (space optional). */
const EIRCODE_RE =
  /^[AC-FHKNPRTV-Y][0-9]{2}\s?[0-9AC-FHKNPRTV-Y]{4}$/i;

export function normalizeEircode(raw: string): string {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (compact.length !== 7) return compact;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

export function isValidEircode(raw: string): boolean {
  return EIRCODE_RE.test(raw.trim());
}

export function isAddressLabel(value: string): value is AddressLabel {
  return (ADDRESS_LABELS as readonly string[]).includes(value);
}
