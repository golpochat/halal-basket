import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  order: { fulfillmentMode: string; customer?: { name: string } };
  items?: Array<{ quantity: number; product?: { name: string } }>;
};

const shopNav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/prep', label: 'Scheduled prep' },
  { to: '/products', label: 'Products' },
];

export function ShopPrepPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['shop']}>
        <PrepInner />
      </RequireRole>
    </RequireAuth>
  );
}

function PrepInner() {
  const { session } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Fulfillment[]>(
      `/shop-portal/orders?deliveryDate=${encodeURIComponent(date)}`,
      { token: session!.accessToken },
    )
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, [session, date]);

  return (
    <AppShell title="Scheduled prep" nav={shopNav} homeTo="/">
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
      <ul className="mt-6 space-y-3">
        {orders.map((f) => (
          <li key={f.id} className="hb-surface p-4 shadow-sm">
            <p className="font-semibold">
              {f.order.customer?.name ?? 'Customer'} · {f.status}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--hb-ink)]/65">
              {(f.items ?? []).map((it, idx) => (
                <li key={idx}>
                  {it.quantity}× {it.product?.name ?? 'Item'}
                </li>
              ))}
            </ul>
          </li>
        ))}
        {orders.length === 0 && (
          <p className="text-[var(--hb-ink)]/55">
            No scheduled fulfillments for this date.
          </p>
        )}
      </ul>
    </AppShell>
  );
}
