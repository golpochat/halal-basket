/**
 * Display-only product title translations.
 * Cart / order payloads keep the canonical English `Product.name`.
 */
const PRODUCT_NAMES: Record<
  string,
  { bn: string; hi: string; ur: string; ar: string }
> = {
  'Basmati Rice 5kg': {
    bn: 'বাসমতি চাল ৫ কেজি',
    hi: 'बासमती चावल ५ किग्रा',
    ur: 'باسمتی چاول ۵ کلو',
    ar: 'أرز بسمتي ٥ كغ',
  },
  'Chicken Thighs 1kg': {
    bn: 'মুরগির উরু ১ কেজি',
    hi: 'मुर्गी जांघ १ किग्रा',
    ur: 'مرغی ران ۱ کلو',
    ar: 'أفخاذ دجاج ١ كغ',
  },
  'Olive Oil 1L': {
    bn: 'জলপাই তেল ১ লিটার',
    hi: 'जैतून का तेल १ लीटर',
    ur: 'زیتون کا تیل ۱ لیٹر',
    ar: 'زيت زيتون ١ لتر',
  },
};

export function localizeProductName(
  canonicalName: string,
  languageCode = 'en',
): string {
  if (!canonicalName || languageCode === 'en') return canonicalName;
  const row = PRODUCT_NAMES[canonicalName];
  if (!row) return canonicalName;
  if (languageCode === 'bn') return row.bn;
  if (languageCode === 'hi') return row.hi;
  if (languageCode === 'ur') return row.ur;
  if (languageCode === 'ar') return row.ar;
  return canonicalName;
}
