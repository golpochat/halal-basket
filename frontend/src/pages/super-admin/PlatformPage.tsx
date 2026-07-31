import { FormEvent, useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type Shop = { id: string; name: string };
type Analytics = {
  orders: { total: number; completed: number; successRate: number };
  payments: { paidOrders: number; revenue: number; refunds: number };
  fulfillments: { deliveryRate: number };
  trust: {
    complaints: number;
    blockedCustomers: number;
    missingItemReports: number;
  };
};

const nav = [
  { to: '/admin', label: 'Ops' },
  { to: '/super-admin', label: 'Platform', end: true },
];

export function SuperAdminPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <PlatformInner />
      </RequireRole>
    </RequireAuth>
  );
}

function PlatformInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [shops, setShops] = useState<Shop[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'shop' | 'driver' | 'admin'>('driver');
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');
  const [shopName, setShopName] = useState('');
  const [eraseId, setEraseId] = useState('');

  async function refresh() {
    const [s, a, m] = await Promise.all([
      api<Shop[]>('/admin/shops', { token }),
      api<Analytics>('/admin/analytics/summary', { token }),
      api<Record<string, number>>('/admin/metrics', { token }),
    ]);
    setShops(s);
    setAnalytics(a);
    setMetrics(m);
    if (!shopId && s[0]) setShopId(s[0].id);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [token]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          role,
          name: role === 'admin' ? undefined : name,
          shopId: role === 'shop' ? shopId : undefined,
        }),
      });
      setMsg('User created');
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function createShop(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/admin/shops', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: shopName,
          deliveryZones: ['Lucan'],
          isActive: true,
        }),
      });
      setShopName('');
      setMsg('Shop created');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shop create failed');
    }
  }

  async function importCsv(file: File) {
    setError('');
    setMsg('');
    const form = new FormData();
    form.append('file', file);
    const q = shopId ? `?shopId=${shopId}` : '';
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/admin/products/import${q}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Import failed');
      setMsg(`Imported ${body.imported}, failed ${body.failed}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <AppShell title="Platform" nav={nav} homeTo="/super-admin">
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

      {analytics && (
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Orders"
            value={`${analytics.orders.total} (${analytics.orders.successRate}% ok)`}
          />
          <Stat
            label="Revenue"
            value={`€${analytics.payments.revenue.toFixed(2)}`}
          />
          <Stat
            label="Delivery rate"
            value={`${analytics.fulfillments.deliveryRate}%`}
          />
          <Stat
            label="Trust"
            value={`${analytics.trust.complaints} complaints`}
          />
        </section>
      )}

      {metrics && (
        <p className="mb-6 text-sm text-[var(--hb-ink)]/55">
          HTTP requests: {metrics.httpRequests ?? 0} · order creates:{' '}
          {metrics.orderCreates ?? 0}
        </p>
      )}

      <section className="hb-surface mb-8 p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Create shop</h2>
        <form onSubmit={createShop} className="mt-3 flex flex-wrap gap-2">
          <input
            className="hb-input min-w-[14rem] flex-1"
            placeholder="Shop name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
          <button className="hb-btn hb-btn-primary">Create shop</button>
        </form>
      </section>

      <section className="hb-surface mb-8 p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Create user</h2>
        <form onSubmit={createUser} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="hb-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="hb-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="hb-input"
            placeholder="Name (shop/driver)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="hb-input"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'shop' | 'driver' | 'admin')
            }
          >
            <option value="driver">driver</option>
            <option value="shop">shop</option>
            <option value="admin">admin</option>
          </select>
          {role === 'shop' && (
            <select
              className="hb-input sm:col-span-2"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button className="hb-btn hb-btn-primary sm:col-span-2">
            Create user
          </button>
        </form>
      </section>

      <section className="hb-surface mb-8 p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">
          Catalogue import / export
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className="hb-input w-auto"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="hb-btn hb-btn-ghost cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCsv(f);
              }}
            />
          </label>
          <a
            className="hb-btn hb-btn-ghost"
            href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/admin/products/export?format=csv`}
            onClick={(e) => {
              e.preventDefault();
              void fetch(
                `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/admin/products/export?format=csv`,
                { headers: { Authorization: `Bearer ${token}` } },
              )
                .then((r) => r.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'products.csv';
                  a.click();
                });
            }}
          >
            Export CSV
          </a>
        </div>
      </section>

      <section className="hb-surface mb-8 p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">GDPR erase</h2>
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
          Permanently erase a customer by customer UUID (super-admin only).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="hb-input min-w-[16rem] flex-1"
            placeholder="Customer UUID"
            value={eraseId}
            onChange={(e) => setEraseId(e.target.value)}
          />
          <button
            type="button"
            className="hb-btn hb-btn-ghost"
            onClick={async () => {
              if (!eraseId.trim()) return;
              setError('');
              try {
                await api(`/admin/customers/${eraseId}/erase`, {
                  method: 'POST',
                  token,
                });
                setMsg('Customer erased');
                setEraseId('');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Erase failed');
              }
            }}
          >
            Erase
          </button>
        </div>
      </section>

      <section className="hb-surface p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Ops drill</h2>
        <button
          type="button"
          className="hb-btn hb-btn-primary mt-3"
          onClick={async () => {
            await api('/admin/ops/test-alert', {
              method: 'POST',
              token,
              body: JSON.stringify({ reason: 'ui-drill' }),
            });
            setMsg('Test alert fired');
          }}
        >
          Fire test alert
        </button>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hb-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
