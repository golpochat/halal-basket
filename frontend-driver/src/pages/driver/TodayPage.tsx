import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  shop?: { name: string; address: string | null };
  order: {
    id: string;
    fulfillmentMode: string;
    customer?: { name: string };
  };
};

const driverNav = [{ to: '/', label: 'Today', end: true }];

export function DriverTodayPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['driver']}>
        <TodayInner />
      </RequireRole>
    </RequireAuth>
  );
}

function TodayInner() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Fulfillment[]>('/driver/orders/today', {
      token: session!.accessToken,
    })
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, [session]);

  return (
    <AppShell title="Today’s deliveries" nav={driverNav} homeTo="/">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mx-auto max-w-lg space-y-3">
        {orders.map((f) => (
          <Link
            key={f.id}
            to={`/orders/${f.id}`}
            className="hb-surface block p-4 shadow-sm transition hover:-translate-y-0.5"
          >
            <div className="flex justify-between gap-2">
              <span className="font-semibold">
                {f.order.customer?.name ?? 'Customer'}
              </span>
              <span className="text-sm font-medium text-[var(--hb-green)]">
                {f.status.replaceAll('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--hb-ink)]/60">
              {f.shop?.name ?? 'Shop'} ·{' '}
              {f.order.fulfillmentMode.replaceAll('_', ' ')}
            </p>
          </Link>
        ))}
        {orders.length === 0 && (
          <p className="text-[var(--hb-ink)]/55">
            No deliveries assigned for today.
          </p>
        )}
      </div>
    </AppShell>
  );
}
