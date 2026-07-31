import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type CartLine = {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  shopId: string;
  shopName?: string;
};

type CartContextValue = {
  shopId: string;
  setShopId: (id: string) => void;
  lines: CartLine[];
  count: number;
  total: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  add: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  setQty: (productId: string, quantity: number) => void;
  clear: () => void;
  getQty: (productId: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [shopId, setShopIdState] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const setShopId = useCallback((id: string) => {
    setShopIdState(id);
    setLines([]);
  }, []);

  const add = useCallback(
    (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => {
      const qty = line.quantity ?? 1;
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === line.productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === line.productId
              ? { ...l, quantity: l.quantity + qty }
              : l,
          );
        }
        return [...prev, { ...line, quantity: qty }];
      });
    },
    [],
  );

  const setQty = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) =>
        l.productId === productId ? { ...l, quantity } : l,
      );
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const getQty = useCallback(
    (productId: string) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const total = lines.reduce((a, l) => a + l.price * l.quantity, 0);

  const value = useMemo(
    () => ({
      shopId,
      setShopId,
      lines,
      count,
      total,
      cartOpen,
      setCartOpen,
      add,
      setQty,
      clear,
      getQty,
    }),
    [shopId, setShopId, lines, count, total, cartOpen, add, setQty, clear, getQty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart requires CartProvider');
  return ctx;
}
