import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  order: { id: string; fulfillmentMode: string; customer?: { name: string } };
};

const shopNav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/prep', label: 'Scheduled prep' },
  { to: '/products', label: 'Products' },
];

export function ShopDashboardPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['shop']}>
        <DashboardInner />
      </RequireRole>
    </RequireAuth>
  );
}

function DashboardInner() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Fulfillment[]>('/shop-portal/orders', {
      token: session!.accessToken,
    })
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, [session]);

  const open = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status),
  );

  return (
    <AppShell title="Shop dashboard" nav={shopNav} homeTo="/">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
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
    </AppShell>
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
