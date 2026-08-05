/** Normalize to E.164 (+ and digits). Returns null if empty/invalid. */
export function normalizeE164(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/[\s()-]/g, '');
  const withPlus = compact.startsWith('+')
    ? compact
    : compact.replace(/^\d/, (d) => `+${d}`);
  // E.164: + then 8–15 digits
  if (!/^\+[1-9]\d{7,14}$/.test(withPlus)) return null;
  return withPlus;
}

export function isValidE164(raw: string | null | undefined): boolean {
  return normalizeE164(raw) != null;
}
