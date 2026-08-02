import { useEffect, useMemo, useState } from 'react';
import {
  ICON_SIZES,
  IconButton,
  UtilityIcons,
  toastError,
  toastSuccess,
} from '@halal-basket/web';
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
    refresh().catch((e) => toastError(e, 'Could not load products'));
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
      toastSuccess('Product saved');
    } catch (e) {
      toastError(e, 'Could not save product');
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
        <IconButton
          label="Refresh products"
          tooltip="Refresh"
          onClick={() =>
            refresh().catch((e) => toastError(e, 'Could not refresh products'))
          }
        >
          {UtilityIcons.refresh({ size: ICON_SIZES.sm })}
        </IconButton>
      </div>

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
          <IconButton
            label="Previous page"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
          </IconButton>
          <IconButton
            label="Next page"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
