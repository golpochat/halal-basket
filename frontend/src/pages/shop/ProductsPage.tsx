import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type ShopProduct = {
  id: string;
  price: string | number;
  isInStock: boolean;
  isVisible: boolean;
  product: { name: string; barcode: string };
};

const shopNav = [
  { to: '/shop', label: 'Dashboard', end: true },
  { to: '/shop/orders', label: 'Orders' },
  { to: '/shop/prep', label: 'Scheduled prep' },
  { to: '/shop/products', label: 'Products' },
];

export function ShopProductsPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['shop']}>
        <ProductsInner />
      </RequireRole>
    </RequireAuth>
  );
}

function ProductsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function refresh() {
    setProducts(await api<ShopProduct[]>('/shop-portal/products', { token }));
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [token]);

  async function save(sp: ShopProduct, price: number, isInStock: boolean) {
    setError('');
    setMsg('');
    try {
      await api(`/shop-portal/products/${sp.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ price, isInStock }),
      });
      await refresh();
      setMsg('Saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  return (
    <AppShell title="Products" nav={shopNav} homeTo="/shop">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm text-[var(--hb-green)]">
          {msg}
        </p>
      )}
      <div className="space-y-3">
        {products.map((sp) => (
          <ProductRow key={sp.id} sp={sp} onSave={save} />
        ))}
      </div>
    </AppShell>
  );
}

function ProductRow({
  sp,
  onSave,
}: {
  sp: ShopProduct;
  onSave: (sp: ShopProduct, price: number, isInStock: boolean) => void;
}) {
  const [price, setPrice] = useState(String(sp.price));
  const [inStock, setInStock] = useState(sp.isInStock);
  return (
    <article className="hb-surface flex flex-wrap items-end justify-between gap-3 p-4 shadow-sm">
      <div>
        <p className="font-semibold">{sp.product.name}</p>
        <p className="text-xs text-[var(--hb-ink)]/45">{sp.product.barcode}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium">
          Price (€)
          <input
            className="hb-input mt-1 w-28 py-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          In stock
        </label>
        <button
          type="button"
          className="hb-btn hb-btn-primary py-2 text-sm"
          onClick={() => onSave(sp, Number(price), inStock)}
        >
          Save
        </button>
      </div>
    </article>
  );
}
