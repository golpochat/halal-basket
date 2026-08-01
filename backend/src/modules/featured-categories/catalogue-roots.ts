/** Top-level catalogue taxonomy ids (mirrors shared CATEGORY_TREE roots). */
export const CATALOGUE_ROOT_CATEGORIES = [
  { id: 'meat-poultry', name: 'Meat & Poultry' },
  { id: 'fruits-veg', name: 'Fruits & Vegetables' },
  { id: 'cooking', name: 'Cooking Essentials' },
  { id: 'beverages', name: 'Beverages' },
  { id: 'home-cleaning', name: 'Home & Cleaning' },
  { id: 'dairy', name: 'Dairy & Eggs' },
] as const;

export type CatalogueRootId = (typeof CATALOGUE_ROOT_CATEGORIES)[number]['id'];

export const FEATURED_CATEGORY_MIN = 3;
export const FEATURED_CATEGORY_MAX = 8;

export const CATALOGUE_ROOT_IDS: Set<string> = new Set(
  CATALOGUE_ROOT_CATEGORIES.map((c) => c.id),
);

export function catalogueRootName(id: string): string | null {
  return CATALOGUE_ROOT_CATEGORIES.find((c) => c.id === id)?.name ?? null;
}
