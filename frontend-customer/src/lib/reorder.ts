import { useCartStore } from '@halal-basket/web';

export type ReorderItem = {
  productId: string;
  quantity: number;
  name?: string | null;
  unitPrice?: string | number;
  product?: { name?: string | null; imageUrl?: string | null } | null;
};

/** Replace the cart with items from a past order (does not place an order). */
export function loadOrderIntoCart(items: ReorderItem[]): number {
  const cart = useCartStore.getState();
  cart.clear();
  let added = 0;
  for (const item of items) {
    if (!item.productId || item.quantity < 1) continue;
    const name = item.product?.name ?? item.name ?? 'Product';
    const price = Number(item.unitPrice ?? 0);
    cart.add({
      productId: item.productId,
      quantity: item.quantity,
      name,
      price: Number.isFinite(price) ? price : 0,
      imageUrl: item.product?.imageUrl ?? null,
    });
    added += 1;
  }
  return added;
}
