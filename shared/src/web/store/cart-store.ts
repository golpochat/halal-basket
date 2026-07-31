import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLine = {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  shopId: string;
  shopName?: string;
};

type CartState = {
  shopId: string;
  lines: CartLine[];
  cartOpen: boolean;
  setShopId: (id: string) => void;
  setCartOpen: (open: boolean) => void;
  add: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  setQty: (productId: string, quantity: number) => void;
  clear: () => void;
  getQty: (productId: string) => number;
  count: () => number;
  total: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: '',
      lines: [],
      cartOpen: false,
      setShopId: (id) => set({ shopId: id, lines: [] }),
      setCartOpen: (open) => set({ cartOpen: open }),
      add: (line) => {
        const qty = line.quantity ?? 1;
        set((state) => {
          const existing = state.lines.find((l) => l.productId === line.productId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === line.productId
                  ? { ...l, quantity: l.quantity + qty }
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
      clear: () => set({ lines: [] }),
      getQty: (productId) =>
        get().lines.find((l) => l.productId === productId)?.quantity ?? 0,
      count: () => get().lines.reduce((a, l) => a + l.quantity, 0),
      total: () => get().lines.reduce((a, l) => a + l.price * l.quantity, 0),
    }),
    {
      name: 'hb_cart',
      partialize: (s) => ({ shopId: s.shopId, lines: s.lines }),
    },
  ),
);
