import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type LiveSnapshot = {
  id: string;
  status: string;
  fulfillmentMode: string;
  fulfillments: Array<{
    id: string;
    shopId: string;
    shopName?: string;
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
  fulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop?: { name: string };
  }>;
  events?: Array<{ id: string; eventType: string; createdAt: string }>;
};

const customerNav = [
  { to: '/', label: 'Catalogue', end: true },
  { to: '/orders', label: 'My orders' },
];

export function OrdersPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['customer']}>
        <OrdersInner />
      </RequireRole>
    </RequireAuth>
  );
}

function OrdersInner() {
  const { session } = useAuth();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [list, setList] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const token = session!.accessToken;

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

  const fulfillments =
    live?.fulfillments ??
    order?.fulfillments.map((f) => ({
      id: f.id,
      shopId: '',
      shopName: f.shop?.name,
      status: f.status,
      deliveryDate: f.deliveryDate,
      estimatedDeliveryAt: null as string | null,
    })) ??
    [];

  return (
    <AppShell
      title={id ? 'Order status' : 'My orders'}
      nav={customerNav}
      homeTo="/"
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {(order || live) && (
        <div className="hb-surface space-y-3 p-6 shadow-sm">
          {id && (
            <p className="text-xs text-[var(--hb-ink)]/45">
              Live updates every 5 seconds
            </p>
          )}
          <p className="font-mono text-xs">{id}</p>
          <p>
            Order:{' '}
            <strong>{live?.status ?? order?.status}</strong>
          </p>
          <p>Mode: {(live?.fulfillmentMode ?? order?.fulfillmentMode)?.replaceAll('_', ' ')}</p>
          {order && (
            <p className="font-display text-2xl">
              €{Number(order.totalAmount).toFixed(2)}
            </p>
          )}
          <div className="space-y-2 border-t border-[rgba(26,92,58,0.1)] pt-3">
            {fulfillments.map((f) => (
              <div
                key={f.id}
                className="rounded-xl bg-[var(--hb-mist)]/50 px-3 py-2 text-sm"
              >
                <p>
                  {f.shopName ?? 'Shop'} · <strong>{f.status}</strong>
                </p>
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
            ← Back to catalogue
          </Link>
        </div>
      )}

      {list && (
        <ul className="space-y-3">
          {list.length === 0 && (
            <p className="text-[var(--hb-ink)]/55">No orders yet.</p>
          )}
          {list.map((o) => (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="hb-surface block p-4 shadow-sm transition hover:-translate-y-0.5"
              >
                <div className="flex justify-between gap-4">
                  <span className="font-mono text-xs">
                    {o.id.slice(0, 8)}…
                  </span>
                  <span className="font-semibold">{o.status}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--hb-ink)]/60">
                  {o.fulfillmentMode.replaceAll('_', ' ')} · €
                  {Number(o.totalAmount).toFixed(2)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
