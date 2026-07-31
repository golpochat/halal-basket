import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type Driver = { id: string; name: string; phone: string | null };
type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  driverId: string | null;
  driver?: { name: string } | null;
  order: { id: string; fulfillmentMode: string; customer?: { name: string } };
};

const STATUSES = [
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

const shopNav = [
  { to: '/shop', label: 'Dashboard', end: true },
  { to: '/shop/orders', label: 'Orders' },
  { to: '/shop/prep', label: 'Scheduled prep' },
  { to: '/shop/products', label: 'Products' },
];

export function ShopOrdersPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['shop']}>
        <OrdersInner />
      </RequireRole>
    </RequireAuth>
  );
}

function OrdersInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function refresh() {
    const [o, d] = await Promise.all([
      api<Fulfillment[]>('/shop-portal/orders', { token }),
      api<Driver[]>('/shop-portal/drivers', { token }),
    ]);
    setOrders(o);
    setDrivers(d);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [token]);

  async function setStatus(id: string, status: string) {
    setError('');
    setMsg('');
    try {
      await api(`/shop-portal/orders/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      await refresh();
      setMsg('Status updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function assign(id: string) {
    const driverId = selectedDriver[id] || drivers[0]?.id;
    if (!driverId) {
      setError('No drivers available — ask super-admin to create one');
      return;
    }
    try {
      await api(`/shop-portal/orders/${id}/assign-driver`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ driverId }),
      });
      await refresh();
      setMsg('Driver assigned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed');
    }
  }

  return (
    <AppShell title="Orders" nav={shopNav} homeTo="/shop">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm text-[var(--hb-green)]">
          {msg}
        </p>
      )}
      <div className="space-y-3">
        {orders.map((f) => (
          <article key={f.id} className="hb-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold">
                  {f.order.customer?.name ?? 'Customer'} · {f.status}
                </p>
                <p className="text-xs text-[var(--hb-ink)]/50">
                  {f.order.fulfillmentMode.replaceAll('_', ' ')}
                  {f.deliveryDate
                    ? ` · ${new Date(f.deliveryDate).toLocaleDateString()}`
                    : ''}
                  {f.driver?.name
                    ? ` · ${f.driver.name}`
                    : f.driverId
                      ? ' · driver assigned'
                      : ' · no driver'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="hb-input w-auto py-2 text-sm"
                  value={f.status}
                  onChange={(e) => setStatus(f.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                <select
                  className="hb-input w-auto min-w-[10rem] py-2 text-sm"
                  value={selectedDriver[f.id] ?? drivers[0]?.id ?? ''}
                  onChange={(e) =>
                    setSelectedDriver((m) => ({ ...m, [f.id]: e.target.value }))
                  }
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="hb-btn hb-btn-ghost py-2 text-sm"
                  onClick={() => assign(f.id)}
                >
                  Assign driver
                </button>
              </div>
            </div>
          </article>
        ))}
        {orders.length === 0 && (
          <p className="text-[var(--hb-ink)]/55">No orders yet.</p>
        )}
      </div>
    </AppShell>
  );
}
