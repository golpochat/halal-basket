import { useEffect, useMemo, useState } from 'react';
import { ICON_SIZES, UtilityIcons } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  order: { fulfillmentMode: string; customer?: { name: string } };
  items?: Array<{ quantity: number; product?: { name: string } }>;
};

const PAGE_SIZE = 10;

export function ShopPrepPage() {
  const { session } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    api<Fulfillment[]>(
      `/shop-portal/orders?deliveryDate=${encodeURIComponent(date)}`,
      { token: session!.accessToken },
    )
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, [session, date]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div>
      <label className="block max-w-xs text-sm font-medium">
        Delivery date
        <input
          type="date"
          className="hb-input mt-1.5"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <p className="mb-3 mt-4 text-sm text-[var(--hb-ink)]/55">
        {orders.length} scheduled · {PAGE_SIZE} per page
      </p>

      <div className="hb-data-table-wrap">
        <table className="hb-data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((f) => (
              <tr key={f.id}>
                <td className="font-semibold">
                  {f.order.customer?.name ?? 'Customer'}
                </td>
                <td>{f.status.replaceAll('_', ' ')}</td>
                <td className="text-[var(--hb-ink)]/65">
                  {f.order.fulfillmentMode.replaceAll('_', ' ')}
                </td>
                <td className="text-sm text-[var(--hb-ink)]/65">
                  {(f.items ?? []).length === 0 ? (
                    '—'
                  ) : (
                    <ul className="space-y-0.5">
                      {(f.items ?? []).map((it, idx) => (
                        <li key={idx}>
                          {it.quantity}× {it.product?.name ?? 'Item'}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-[var(--hb-ink)]/55">
                  No scheduled fulfillments for this date.
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
