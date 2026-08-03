import { useEffect, useState } from 'react';
import {
  StatusBadge,
  formatFulfillmentMode,
  toastError,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  order: { id: string; fulfillmentMode: string; customer?: { name: string } };
};

function todayUtcDate(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ShopDashboardPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [openAll, setOpenAll] = useState(0);

  useEffect(() => {
    const token = session!.accessToken;
    const today = todayUtcDate();
    Promise.all([
      api<Fulfillment[]>(`/shop-portal/orders?deliveryDate=${today}`, {
        token,
      }),
      api<Fulfillment[]>('/shop-portal/orders', { token }),
    ])
      .then(([todayOrders, all]) => {
        setOrders(todayOrders);
        setOpenAll(
          all.filter(
            (o) =>
              !['delivered', 'failed_attempt', 'cancelled'].includes(o.status),
          ).length,
        );
      })
      .catch((e) => toastError(e, 'Could not load dashboard'));
  }, [session]);

  const openToday = orders.filter(
    (o) =>
      !['delivered', 'failed_attempt', 'cancelled'].includes(o.status),
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open orders" value={String(openAll)} />
        <Stat label="Total today" value={String(orders.length)} />
        <Stat
          label="Ready today"
          value={String(orders.filter((o) => o.status === 'ready').length)}
        />
      </div>
      <h2 className="mt-8 font-display text-xl font-semibold">Needs attention</h2>
      <ul className="mt-3 space-y-2">
        {openToday.slice(0, 8).map((f) => (
          <li key={f.id} className="hb-surface px-4 py-3 text-sm shadow-sm">
            <strong>{f.order.customer?.name ?? 'Customer'}</strong>
            <span className="mx-2 text-[var(--hb-ink)]/35">·</span>
            <StatusBadge status={f.status} />
            <span className="mx-2 text-[var(--hb-ink)]/35">·</span>
            {formatFulfillmentMode(f.order.fulfillmentMode)}
          </li>
        ))}
        {openToday.length === 0 && (
          <p className="text-[var(--hb-ink)]/55">All clear for today.</p>
        )}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hb-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}
