import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Shop = { id: string; name: string };
type ShopProduct = {
  id: string;
  productId: string;
  price: string | number;
  discountPrice: string | number | null;
  isInStock: boolean;
  product: { id: string; name: string; description: string | null };
};

export function CataloguePage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState('');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    api<Shop[]>('/shops')
      .then((data) => {
        setShops(data);
        if (data[0]) setShopId(data[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!shopId) return;
    api<ShopProduct[]>(`/shops/${shopId}/products`)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [shopId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.product.name.toLowerCase().includes(q),
    );
  }, [products, query]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const sp = products.find((p) => p.productId === productId);
        return { productId, quantity, sp };
      });
  }, [cart, products]);

  const cartCount = cartLines.reduce((a, l) => a + l.quantity, 0);
  const cartTotal = cartLines.reduce((a, l) => {
    if (!l.sp) return a;
    const price = Number(l.sp.discountPrice ?? l.sp.price);
    return a + price * l.quantity;
  }, 0);

  function add(productId: string) {
    setCart((c) => ({ ...c, [productId]: (c[productId] ?? 0) + 1 }));
    setCartOpen(true);
  }

  function setQty(productId: string, quantity: number) {
    setCart((c) => {
      const next = { ...c };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  }

  function goCheckout() {
    const items = cartLines.map(({ productId, quantity }) => ({
      productId,
      quantity,
    }));
    sessionStorage.setItem(
      'hb_checkout',
      JSON.stringify({ shopId, items }),
    );
    if (!session) {
      navigate('/login?next=/customer/checkout');
      return;
    }
    if (session.user.role !== 'customer') {
      setError('Please sign in with a customer account to order');
      return;
    }
    navigate('/customer/checkout');
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {session?.user.role === 'customer' ? (
              <>
                <Link
                  to="/customer/orders"
                  className="hb-btn hb-btn-ghost px-3 py-1.5"
                >
                  My orders
                </Link>
                <button
                  type="button"
                  className="hb-btn hb-btn-ghost px-3 py-1.5"
                  onClick={logout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hb-btn hb-btn-ghost px-3 py-1.5">
                  Sign in
                </Link>
                <Link
                  to="/customer/register"
                  className="hb-btn hb-btn-primary px-3 py-1.5"
                >
                  Register
                </Link>
              </>
            )}
            <button
              type="button"
              className="hb-btn hb-btn-primary px-3 py-1.5"
              onClick={() => setCartOpen(true)}
            >
              Cart ({cartCount})
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="hb-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Fresh picks for your basket
            </h1>
            <p className="mt-2 text-[var(--hb-ink)]/65">
              Choose a shop, add items, checkout in a few clear steps.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/50">
              Shop
              <select
                className="hb-input mt-1"
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value);
                  setCart({});
                }}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              className="hb-input"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="hb-fade-up-delay mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const price = Number(p.discountPrice ?? p.price);
            const qty = cart[p.productId] ?? 0;
            return (
              <article
                key={p.id}
                className="hb-surface flex flex-col p-5 shadow-sm transition hover:-translate-y-0.5"
              >
                <h2 className="font-semibold">{p.product.name}</h2>
                <p className="mt-1 flex-1 text-sm text-[var(--hb-ink)]/55">
                  {p.product.description || 'Halal grocery item'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="font-display text-xl font-semibold">
                    €{price.toFixed(2)}
                  </p>
                  {!p.isInStock ? (
                    <span className="text-sm text-red-700">Out of stock</span>
                  ) : qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="hb-btn hb-btn-ghost px-3 py-1.5"
                        onClick={() => setQty(p.productId, qty - 1)}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold">
                        {qty}
                      </span>
                      <button
                        type="button"
                        className="hb-btn hb-btn-primary px-3 py-1.5"
                        onClick={() => add(p.productId)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="hb-btn hb-btn-primary px-4 py-2 text-sm"
                      onClick={() => add(p.productId)}
                    >
                      Add
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="mt-10 text-center text-[var(--hb-ink)]/55">
            No products match your search.
          </p>
        )}
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30 p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[var(--hb-cream)] shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(26,92,58,0.1)] px-5 py-4">
              <h2 className="font-display text-xl font-semibold">Your cart</h2>
              <button
                type="button"
                className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
                onClick={() => setCartOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {cartLines.length === 0 && (
                <p className="text-sm text-[var(--hb-ink)]/55">
                  Your basket is empty. Add something delicious.
                </p>
              )}
              {cartLines.map((l) => (
                <div
                  key={l.productId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/80 p-3"
                >
                  <div>
                    <p className="font-medium">
                      {l.sp?.product.name ?? 'Item'}
                    </p>
                    <p className="text-sm text-[var(--hb-ink)]/55">
                      €
                      {Number(l.sp?.discountPrice ?? l.sp?.price ?? 0).toFixed(
                        2,
                      )}{' '}
                      each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost px-2 py-1"
                      onClick={() => setQty(l.productId, l.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <button
                      type="button"
                      className="hb-btn hb-btn-primary px-2 py-1"
                      onClick={() => setQty(l.productId, l.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(26,92,58,0.1)] px-5 py-4">
              <div className="mb-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>€{cartTotal.toFixed(2)}</span>
              </div>
              <button
                type="button"
                disabled={cartCount === 0}
                className="hb-btn hb-btn-primary w-full py-3"
                onClick={goCheckout}
              >
                Checkout
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
