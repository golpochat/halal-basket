import { useEffect, useState } from 'react';
import { toastError } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  order: { id: string; fulfillmentMode: string; customer?: { name: string } };
};

export function ShopDashboardPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Fulfillment[]>([]);

  useEffect(() => {
    api<Fulfillment[]>('/shop-portal/orders', {
      token: session!.accessToken,
    })
      .then(setOrders)
      .catch((e) => toastError(e, 'Could not load dashboard'));
  }, [session]);

  const open = orders.filter(
    (o) =>
      !['delivered', 'failed_attempt', 'cancelled'].includes(o.status),
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open fulfillments" value={String(open.length)} />
        <Stat label="Total today" value={String(orders.length)} />
        <Stat
          label="Ready"
          value={String(orders.filter((o) => o.status === 'ready').length)}
        />
      </div>
      <h2 className="mt-8 font-display text-xl font-semibold">Needs attention</h2>
      <ul className="mt-3 space-y-2">
        {open.slice(0, 8).map((f) => (
          <li key={f.id} className="hb-surface px-4 py-3 text-sm shadow-sm">
            <strong>{f.order.customer?.name ?? 'Customer'}</strong> ·{' '}
            {f.status} · {f.order.fulfillmentMode.replaceAll('_', ' ')}
          </li>
        ))}
        {open.length === 0 && (
          <p className="text-[var(--hb-ink)]/55">All clear for now.</p>
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
