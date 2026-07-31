import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalePickers } from '../../components/LocalePickers';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';

type Shop = { id: string; name: string };
type ShopProduct = {
  id: string;
  productId: string;
  price: string | number;
  discountPrice: string | number | null;
  isInStock: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    category: { id: string; name: string; slug: string } | null;
  };
};
type CalendarRow = {
  id: string;
  areaName: string;
  deliveryDay: string;
};

export function CataloguePage() {
  const { session } = useAuth();
  const { formatMoney } = useLocale();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState('');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [areas, setAreas] = useState<CalendarRow[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Shop[]>('/shops'),
      api<CalendarRow[]>('/delivery-calendar'),
    ])
      .then(([shopData, calendar]) => {
        setShops(shopData);
        setAreas(calendar);
        if (shopData[0]) setShopId(shopData[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!shopId) return;
    api<ShopProduct[]>(`/shops/${shopId}/products`)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [shopId]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const p of products) {
      if (p.product.category?.name) names.add(p.product.category.name);
    }
    return Array.from(names).sort();
  }, [products]);

  const areaSummary = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of areas) {
      const days = map.get(row.areaName) ?? [];
      days.push(row.deliveryDay);
      map.set(row.areaName, days);
    }
    return Array.from(map.entries()).map(([name, days]) => ({
      name,
      days: days.join(', '),
    }));
  }, [areas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (
        category !== 'all' &&
        (p.product.category?.name ?? '') !== category
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.product.name.toLowerCase().includes(q) ||
        (p.product.description ?? '').toLowerCase().includes(q) ||
        (p.product.category?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

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
    const items = cartLines.map(({ productId, quantity, sp }) => ({
      productId,
      quantity,
      name: sp?.product.name,
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

  const catalogueNav = [
    { to: '/customer', label: 'Catalogue', end: true },
    { to: '/help', label: 'Help' },
    ...(session?.user.role === 'customer'
      ? [{ to: '/customer/orders', label: 'My orders' }]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        variant="site"
        homeTo="/"
        nav={catalogueNav}
        actions={
          <>
            <LocalePickers />
            <button
              type="button"
              className="hb-btn hb-btn-primary px-3 py-1.5 text-sm sm:hidden"
              onClick={() => setCartOpen(true)}
            >
              Cart ({cartCount})
            </button>
          </>
        }
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="hb-fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Fresh picks for your basket
            </h1>
            <p className="mt-2 text-[var(--hb-ink)]/65">
              Search first, filter by category, then checkout for pickup or
              scheduled delivery.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[320px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/50">
              Shop
              <select
                className="hb-input mt-1"
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value);
                  setCart({});
                  setCategory('all');
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
              placeholder="Search products (e.g. rice, chicken, oil)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </div>
        </div>

        {areaSummary.length > 0 && (
          <p className="mt-4 text-sm text-[var(--hb-ink)]/55">
            Scheduled delivery areas:{' '}
            {areaSummary.map((a, i) => (
              <span key={a.name}>
                {i > 0 ? ' · ' : ''}
                <strong>{a.name}</strong> ({a.days})
              </span>
            ))}
          </p>
        )}

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                category === 'all'
                  ? 'bg-[var(--hb-green)] text-white'
                  : 'bg-white/80 text-[var(--hb-ink)]'
              }`}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  category === name
                    ? 'bg-[var(--hb-green)] text-white'
                    : 'bg-white/80 text-[var(--hb-ink)]'
                }`}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

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
                {p.product.category && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-green)]">
                    {p.product.category.name}
                  </p>
                )}
                <h2 className="mt-1 font-semibold">{p.product.name}</h2>
                <p className="mt-1 flex-1 text-sm text-[var(--hb-ink)]/55">
                  {p.product.description || 'Halal grocery item'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="font-display text-xl font-semibold">
                    {formatMoney(price)}
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

      <SiteFooter />

      {/* Sticky cart summary — always visible on desktop */}
      <button
        type="button"
        className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl bg-[var(--hb-green)] px-3 py-4 text-white shadow-lg sm:flex"
        onClick={() => setCartOpen(true)}
        aria-label={`Open cart, ${cartCount} items, ${formatMoney(cartTotal)}`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          Cart
        </span>
        <span className="text-sm font-bold">{cartCount} items</span>
        <span className="text-sm">{formatMoney(cartTotal)}</span>
      </button>

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
                      {formatMoney(
                        Number(l.sp?.discountPrice ?? l.sp?.price ?? 0),
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
                <span>{formatMoney(cartTotal)}</span>
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
