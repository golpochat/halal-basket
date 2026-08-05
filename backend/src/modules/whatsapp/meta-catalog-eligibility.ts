/**
 * Meta Commerce rejects animal products for consumption
 * (meat, fish/seafood, eggs) — see facebook.com/policies_center/commerce/animals.
 * Keep WhatsApp catalog sync aligned with that policy; sell those SKUs via the
 * customer app (Assist / Shop) instead.
 */

const BLOCKED_CATEGORY_SLUGS = new Set(['meat-poultry']);
const BLOCKED_CATEGORY_NAMES = new Set(['meat & poultry']);

/** Tags used on blocked cultural-bank SKUs (not plain "dairy"). */
const BLOCKED_TAGS = new Set([
  'eggs',
  'meat',
  'fish',
  'poultry',
  'seafood',
  'chicken',
  'beef',
  'lamb',
  'goat',
  'mutton',
]);

/** Whole-word egg(s) — does not match "eggplant". */
const EGG_RE = /\beggs?\b/i;

/**
 * Meat / fish / poultry cues in name/slug/description when miscategorised.
 * Matches cultural-catalogue product names (not spice mixes).
 */
const MEAT_FISH_RE =
  /\b(chicken|beef|lamb|mutton|goat|poultry|duck|turkey|veal|drumstick|drumsticks|wings?|thighs?|keema|mince|chops?|ribs?|fillets?|steaks?|fish|hilsa|ilish|rohu|pomfret|salmon|prawns?|shrimp|seafood|whole\s+chicken|frozen\s+chicken)\b/i;

export type MetaCatalogEligibilityInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  tags?: unknown;
};

export function isBlockedByMetaCommercePolicy(
  input: MetaCatalogEligibilityInput,
): boolean {
  const catSlug = (input.categorySlug ?? '').trim().toLowerCase();
  const catName = (input.categoryName ?? '').trim().toLowerCase();
  if (BLOCKED_CATEGORY_SLUGS.has(catSlug) || BLOCKED_CATEGORY_NAMES.has(catName)) {
    return true;
  }

  if (Array.isArray(input.tags)) {
    for (const t of input.tags) {
      if (BLOCKED_TAGS.has(String(t).toLowerCase())) return true;
    }
  }

  const hay = [input.name, input.slug ?? '', input.description ?? '']
    .join(' ')
    .toLowerCase();

  if (EGG_RE.test(hay)) return true;
  if (MEAT_FISH_RE.test(hay)) return true;

  return false;
}

export function isMetaCommerceAllowedProduct(
  input: MetaCatalogEligibilityInput,
): boolean {
  return !isBlockedByMetaCommercePolicy(input);
}
