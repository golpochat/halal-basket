import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ICON_SIZES,
  UtilityIcons,
  useDashboardTitle,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type LiveSnapshot = {
  id: string;
  status: string;
  fulfillmentMode: string;
  fulfillments: Array<{
    id: string;
    shopId: string;
    shopName?: string;
    shopAddress?: string | null;
    status: string;
    deliveryDate: string | null;
    estimatedDeliveryAt: string | null;
  }>;
};

type Order = {
  id: string;
  status: string;
  fulfillmentMode: string;
  totalAmount: string | number;
  discountAmount?: string | number;
  couponCode?: string | null;
  fulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop?: { name: string; address?: string | null };
  }>;
  events?: Array<{ id: string; eventType: string; createdAt: string }>;
};

const PAGE_SIZE = 10;

export function OrdersPage() {
  const { session } = useAuth();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [list, setList] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const token = session!.accessToken;

  useDashboardTitle(id ? 'Order status' : '');

  useEffect(() => {
    if (id) {
      api<Order>(`/orders/${id}`, { token })
        .then(setOrder)
        .catch((e) => setError(e.message));
    } else {
      api<Order[]>('/customers/me/orders', { token })
        .then(setList)
        .catch((e) => setError(e.message));
    }
  }, [id, token]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const tick = () => {
      api<LiveSnapshot>(`/orders/${id}/live`, { token })
        .then((snap) => {
          if (!cancelled) setLive(snap);
        })
        .catch(() => undefined);
    };
    tick();
    const handle = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [id, token]);

  const totalPages = Math.max(1, Math.ceil((list?.length ?? 0) / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    if (!list) return [];
    const start = (pageSafe - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const fulfillments =
    live?.fulfillments ??
    order?.fulfillments.map((f) => ({
      id: f.id,
      shopId: '',
      shopName: f.shop?.name,
      shopAddress: f.shop?.address ?? null,
      status: f.status,
      deliveryDate: f.deliveryDate,
      estimatedDeliveryAt: null as string | null,
    })) ??
    [];

  const fulfillmentMode = live?.fulfillmentMode ?? order?.fulfillmentMode;

  if (id) {
    return (
      <div>
        <div className="mb-4">
          <Link
            to="/customer/orders"
            className="hb-icon-btn inline-flex"
            aria-label="Back to orders"
            title="Back to orders"
          >
            {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
          </Link>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {(order || live) && (
          <div className="hb-surface space-y-3 p-6 shadow-sm">
            <p className="text-xs text-[var(--hb-ink)]/45">
              Live updates every 5 seconds
            </p>
            <p className="font-mono text-xs">{id}</p>
            <p>
              Order: <strong>{live?.status ?? order?.status}</strong>
            </p>
            <p>Mode: {fulfillmentMode?.replaceAll('_', ' ')}</p>
            {order && (
              <>
                {Number(order.discountAmount ?? 0) > 0 && (
                  <p className="text-sm text-[var(--hb-green)]">
                    Discount
                    {order.couponCode ? ` (${order.couponCode})` : ''}: −€
                    {Number(order.discountAmount).toFixed(2)}
                  </p>
                )}
                <p className="font-display text-2xl">
                  €{Number(order.totalAmount).toFixed(2)}
                </p>
              </>
            )}
            <div className="space-y-2 border-t border-[rgba(26,92,58,0.1)] pt-3">
              {fulfillments.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl bg-[var(--hb-mist)]/50 px-3 py-2 text-sm"
                >
                  <p>
                    Halal Basket · <strong>{f.status}</strong>
                  </p>
                  {fulfillmentMode === 'pickup' && f.shopAddress && (
                    <p className="text-[var(--hb-ink)]/65">
                      Pickup location: {f.shopAddress}
                    </p>
                  )}
                  {f.deliveryDate && (
                    <p>
                      Delivery: {new Date(f.deliveryDate).toLocaleDateString()}
                    </p>
                  )}
                  {f.estimatedDeliveryAt && (
                    <p>
                      ETA:{' '}
                      {new Date(f.estimatedDeliveryAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {order?.events && order.events.length > 0 && (
              <ul className="space-y-1 text-sm text-[var(--hb-ink)]/60">
                {order.events.map((ev) => (
                  <li key={ev.id}>
                    {new Date(ev.createdAt).toLocaleString()} — {ev.eventType}
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/"
              className="inline-block text-sm font-medium text-[var(--hb-green)]"
            >
              ← Back to home
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {list && (
        <>
          <p className="mb-3 text-sm text-[var(--hb-ink)]/55">
            {list.length} total · {PAGE_SIZE} per page
          </p>

          <div className="hb-data-table-wrap">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs">{o.id.slice(0, 8)}…</td>
                    <td className="font-semibold">{o.status}</td>
                    <td className="text-[var(--hb-ink)]/65">
                      {o.fulfillmentMode.replaceAll('_', ' ')}
                    </td>
                    <td>€{Number(o.totalAmount).toFixed(2)}</td>
                    <td>
                      <div className="hb-data-table__actions">
                        <Link
                          to={`/customer/orders/${o.id}`}
                          className="hb-icon-btn"
                          aria-label={`View order ${o.id.slice(0, 8)}`}
                          title="View order"
                        >
                          {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-[var(--hb-ink)]/55">
                      No orders yet.
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
        </>
      )}
    </div>
  );
}
