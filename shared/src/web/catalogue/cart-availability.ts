import type { ShopProduct } from '../types';

export type CartLineLike = {
  productId: string;
  name?: string;
};

/**
 * Product ids in the cart that are missing from the area catalogue
 * or marked out of stock.
 */
export function diffCartAgainstCatalogue(
  lines: CartLineLike[],
  catalogue: Array<Pick<ShopProduct, 'productId' | 'isInStock'>>,
): string[] {
  const byId = new Map(
    catalogue.map((p) => [p.productId, p] as const),
  );
  const unavailable: string[] = [];
  for (const line of lines) {
    const row = byId.get(line.productId);
    if (!row || !row.isInStock) {
      unavailable.push(line.productId);
    }
  }
  return unavailable;
}
