import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ICON_SIZES,
  IconButton,
  Tooltip,
  UtilityIcons,
  toastError,
  useCartStore,
  useDashboardTitle,
  useOrderLive,
  useToastStore,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { loadOrderIntoCart } from '../../lib/reorder';

type Order = {
  id: string;
  status: string;
  fulfillmentMode: string;
  totalAmount: string | number;
  discountAmount?: string | number;
  couponCode?: string | null;
  items?: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string | number;
    product?: { name?: string | null; imageUrl?: string | null } | null;
  }>;
  fulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop?: { name: string; address?: string | null };
  }>;
  events?: Array<{ id: string; eventType: string; createdAt: string }>;
};

const PAGE_SIZE = 10;
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function OrdersPage() {
  const { session } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.toast);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const [order, setOrder] = useState<Order | null>(null);
  const [list, setList] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const token = session!.accessToken;

  const { snapshot: live, connection, lastEventAt } = useOrderLive({
    orderId: id,
    token,
    baseUrl: API_URL,
    enabled: Boolean(id),
  });

  function onReorder(target: Order) {
    const added = loadOrderIntoCart(target.items ?? []);
    if (added === 0) {
      toast('This order has no items to reorder', 'error');
      return;
    }
    toast(`Added ${added} item${added === 1 ? '' : 's'} from a previous order`);
    setCartOpen(true);
    navigate('/');
  }

  useDashboardTitle(id ? 'Order status' : '');

  useEffect(() => {
    if (id) {
      api<Order>(`/orders/${id}`, { token })
        .then(setOrder)
        .catch((e) => toastError(e, 'Could not load this order'));
    } else {
      api<Order[]>('/customers/me/orders', { token })
        .then(setList)
        .catch((e) => toastError(e, 'Could not load your orders'));
    }
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
    order?.fulfillments.map((f, index, arr) => ({
      id: f.id,
      part: index + 1,
      partsTotal: arr.length,
      shopId: '',
      shopName: f.shop?.name,
      shopAddress: f.shop?.address ?? null,
      status: f.status,
      deliveryDate: f.deliveryDate,
      estimatedDeliveryAt: null as string | null,
    })) ??
    [];

  const fulfillmentMode = live?.fulfillmentMode ?? order?.fulfillmentMode;

  const liveLabel =
    connection === 'live'
      ? 'Live · instant updates'
      : connection === 'polling'
        ? 'Live · polling fallback (every 5s)'
        : connection === 'paused'
          ? 'Paused while tab hidden'
          : connection === 'connecting'
            ? 'Connecting…'
            : 'Live connection issue';

  if (id) {
    return (
      <div>
        <div className="mb-4">
          <Tooltip content="Back to orders">
            <Link
              to="/customer/orders"
              className="hb-icon-btn inline-flex"
              aria-label="Back to orders"
            >
              {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
            </Link>
          </Tooltip>
        </div>

        {(order || live) && (
          <div className="hb-surface space-y-3 p-6 shadow-sm">
            <p className="text-xs text-[var(--hb-ink)]/45">
              {liveLabel}
              {lastEventAt
                ? ` · last ${new Date(lastEventAt).toLocaleTimeString()}`
                : ''}
            </p>
            <p className="font-mono text-xs">{id}</p>
            <p>
              Order: <strong>{live?.status ?? order?.status}</strong>
              {live?.paymentStatus
                ? ` · Payment ${live.paymentStatus}`
                : ''}
            </p>
            <p>Mode: {fulfillmentMode?.replaceAll('_', ' ')}</p>
            {(live?.splitOrder || fulfillments.length > 1) && (
              <p className="rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm">
                Split across {fulfillments.length} Halal Basket deliveries —
                each part may progress on its own.
              </p>
            )}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                Status timeline
              </p>
              {fulfillments.map((f, index) => (
                <div
                  key={f.id}
                  className="rounded-xl bg-[var(--hb-mist)]/50 px-3 py-2 text-sm"
                >
                  <p>
                    {fulfillments.length > 1
                      ? `Part ${f.part ?? index + 1} of ${f.partsTotal ?? fulfillments.length}`
                      : 'Halal Basket'}{' '}
                    · <strong>{f.status.replaceAll('_', ' ')}</strong>
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
            <div className="flex flex-wrap gap-3 pt-1">
              {order?.items && order.items.length > 0 ? (
                <button
                  type="button"
                  className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
                  onClick={() => onReorder(order)}
                >
                  Reorder
                </button>
              ) : null}
              <Link
                to="/"
                className="inline-flex h-9 items-center text-sm font-medium text-[var(--hb-green)]"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
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
                      {o.fulfillments.length > 1
                        ? ` · ${o.fulfillments.length} parts`
                        : ''}
                    </td>
                    <td>€{Number(o.totalAmount).toFixed(2)}</td>
                    <td>
                      <div className="hb-data-table__actions">
                        <button
                          type="button"
                          className="hb-btn hb-btn-ghost h-8 px-2 text-xs"
                          onClick={() => onReorder(o)}
                        >
                          Reorder
                        </button>
                        <Tooltip content="View order">
                          <Link
                            to={`/customer/orders/${o.id}`}
                            className="hb-icon-btn"
                            aria-label={`View order ${o.id.slice(0, 8)}`}
                          >
                            {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
                          </Link>
                        </Tooltip>
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
        </>
      )}
    </div>
  );
}
