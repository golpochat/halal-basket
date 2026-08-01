import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLine = {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  shopId?: string;
  shopName?: string;
  imageUrl?: string | null;
};

export type CouponRule = {
  type: 'percent' | 'fixed';
  value: number;
};

type CartState = {
  shopId: string;
  lines: CartLine[];
  cartOpen: boolean;
  couponCode: string;
  couponApplied: string | null;
  couponRule: CouponRule | null;
  setShopId: (id: string) => void;
  setCartOpen: (open: boolean) => void;
  setCouponCode: (code: string) => void;
  /** Persist a server-validated coupon rule for live discount math. */
  setAppliedCoupon: (code: string, rule: CouponRule) => void;
  clearCoupon: () => void;
  add: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  setQty: (productId: string, quantity: number) => void;
  clear: () => void;
  removeUnavailable: (productIds: string[]) => void;
  getQty: (productId: string) => number;
  count: () => number;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
};

function computeDiscount(sub: number, rule: CouponRule | null): number {
  if (!rule) return 0;
  if (rule.type === 'percent') {
    return Math.round(sub * (rule.value / 100) * 100) / 100;
  }
  return Math.min(rule.value, sub);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: '',
      lines: [],
      cartOpen: false,
      couponCode: '',
      couponApplied: null,
      couponRule: null,
      setShopId: (id) => set({ shopId: id }),
      setCartOpen: (open) => set({ cartOpen: open }),
      setCouponCode: (couponCode) => set({ couponCode }),
      setAppliedCoupon: (code, rule) =>
        set({
          couponApplied: code,
          couponCode: code,
          couponRule: rule,
        }),
      clearCoupon: () =>
        set({ couponApplied: null, couponCode: '', couponRule: null }),
      add: (line) => {
        const qty = line.quantity ?? 1;
        set((state) => {
          const existing = state.lines.find((l) => l.productId === line.productId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === line.productId
                  ? {
                      ...l,
                      quantity: l.quantity + qty,
                      imageUrl: l.imageUrl ?? line.imageUrl,
                    }
                  : l,
              ),
            };
          }
          return {
            lines: [...state.lines, { ...line, quantity: qty }],
          };
        });
      },
      setQty: (productId, quantity) => {
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId ? { ...l, quantity } : l,
                ),
        }));
      },
      clear: () =>
        set({
          lines: [],
          couponApplied: null,
          couponCode: '',
          couponRule: null,
        }),
      removeUnavailable: (productIds) => {
        const ban = new Set(productIds);
        set((state) => ({
          lines: state.lines.filter((l) => !ban.has(l.productId)),
        }));
      },
      getQty: (productId) =>
        get().lines.find((l) => l.productId === productId)?.quantity ?? 0,
      count: () => get().lines.reduce((a, l) => a + l.quantity, 0),
      subtotal: () =>
        get().lines.reduce((a, l) => a + l.price * l.quantity, 0),
      discount: () => computeDiscount(get().subtotal(), get().couponRule),
      total: () => {
        const t = get().subtotal() - get().discount();
        return t < 0 ? 0 : Math.round(t * 100) / 100;
      },
    }),
    {
      name: 'hb_cart',
      partialize: (s) => ({
        shopId: s.shopId,
        lines: s.lines,
        couponApplied: s.couponApplied,
        couponCode: s.couponCode,
        couponRule: s.couponRule,
      }),
    },
  ),
);
