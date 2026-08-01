import { useEffect, useMemo, useState } from 'react';
import { ICON_SIZES, UtilityIcons } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type ShopProduct = {
  id: string;
  price: string | number;
  isInStock: boolean;
  stockQuantity: number;
  isVisible: boolean;
  product: { name: string; barcode: string };
};

const PAGE_SIZE = 10;

export function ShopProductsPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<
    Record<string, { price: string; qty: string; inStock: boolean }>
  >({});

  async function refresh() {
    const list = await api<ShopProduct[]>('/shop-portal/products', { token });
    setProducts(list);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const sp of list) {
        if (!next[sp.id]) {
          next[sp.id] = {
            price: String(sp.price),
            qty: String(sp.stockQuantity ?? 0),
            inStock: sp.isInStock,
          };
        }
      }
      return next;
    });
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [token]);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function updateDraft(
    id: string,
    patch: Partial<{ price: string; qty: string; inStock: boolean }>,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  async function save(sp: ShopProduct) {
    const draft = drafts[sp.id];
    if (!draft) return;
    setError('');
    setMsg('');
    try {
      await api(`/shop-portal/products/${sp.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          price: Number(draft.price),
          stockQuantity: Math.max(0, Math.floor(Number(draft.qty) || 0)),
          isInStock: draft.inStock,
        }),
      });
      await refresh();
      setMsg('Saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-[var(--hb-ink)]/55">
          Stock quantity drives soft holds at checkout. Set to 0 (or uncheck in
          stock) to stop selling. · {products.length} total · {PAGE_SIZE} per
          page
        </p>
        <button
          type="button"
          className="hb-icon-btn"
          aria-label="Refresh products"
          title="Refresh"
          onClick={() => refresh().catch((e) => setError(e.message))}
        >
          {UtilityIcons.refresh({ size: ICON_SIZES.sm })}
        </button>
      </div>

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

      <div className="hb-data-table-wrap">
        <table className="hb-data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Barcode</th>
              <th>Price (€)</th>
              <th>Qty</th>
              <th>In stock</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((sp) => {
              const draft = drafts[sp.id] ?? {
                price: String(sp.price),
                qty: String(sp.stockQuantity ?? 0),
                inStock: sp.isInStock,
              };
              return (
                <tr key={sp.id}>
                  <td className="font-semibold">{sp.product.name}</td>
                  <td className="font-mono text-xs text-[var(--hb-ink)]/65">
                    {sp.product.barcode}
                  </td>
                  <td>
                    <input
                      className="hb-input w-24 py-1.5 text-sm"
                      value={draft.price}
                      onChange={(e) =>
                        updateDraft(sp.id, { price: e.target.value })
                      }
                      aria-label={`Price for ${sp.product.name}`}
                    />
                  </td>
                  <td>
                    <input
                      className="hb-input w-20 py-1.5 text-sm"
                      type="number"
                      min={0}
                      step={1}
                      value={draft.qty}
                      onChange={(e) => {
                        const qty = e.target.value;
                        const n = Number(qty);
                        updateDraft(sp.id, {
                          qty,
                          inStock: Number.isFinite(n) ? n > 0 : draft.inStock,
                        });
                      }}
                      aria-label={`Quantity for ${sp.product.name}`}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={draft.inStock}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateDraft(sp.id, {
                          inStock: checked,
                          qty: checked
                            ? Number(draft.qty) <= 0
                              ? '1'
                              : draft.qty
                            : '0',
                        });
                      }}
                      aria-label={`In stock for ${sp.product.name}`}
                    />
                  </td>
                  <td>
                    <div className="hb-data-table__actions">
                      <button
                        type="button"
                        className="hb-btn hb-btn-primary py-1.5 text-xs"
                        onClick={() => save(sp)}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-[var(--hb-ink)]/55">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="hb-pagination">
        <span>
          Page {pageSafe} of {totalPages}
        </span>
        <div className="hb-pagination__controls">
          <button
            type="button"
            className="hb-icon-btn"
            aria-label="Previous page"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
          </button>
          <button
            type="button"
            className="hb-icon-btn"
            aria-label="Next page"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
          </button>
        </div>
      </div>
    </div>
  );
}
