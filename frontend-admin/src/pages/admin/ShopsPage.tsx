import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SelectInput } from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type ShopRow = {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  loginCount: number;
  productCount: number;
  fulfillmentCount: number;
  openFulfillments: number;
};

export function AdminShopsPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['shops.read']}>
        <ShopsInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function ShopsInner() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const base = isSuper ? '/super-admin' : '/admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('shops.write');

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState<ShopRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [shopName, setShopName] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const list = await api<ShopRow[]>('/admin/shops/directory', { token });
    setRows(list);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === 'active' && !r.isActive) return false;
      if (status === 'inactive' && r.isActive) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.address ?? '').toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  async function createShop(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError('');
    setMsg('');
    setBusy(true);
    try {
      const created = await api<{ id: string }>('/admin/shops', {
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
      if (created?.id) navigate(`${base}/shops/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shop create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Partner shops
      </h1>
      <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
        Open a shop overview for fulfillments, payment status, and attributed
        GMV. Login accounts are managed under Shop logins.
      </p>

      <div className="mt-6">
        <Flash error={error} msg={msg} />

        {canWrite ? (
          <section className="hb-surface mb-6 p-5 shadow-sm">
            <h2 className="font-semibold">Create shop</h2>
            <form
              onSubmit={createShop}
              className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <input
                className="hb-input min-w-0 w-full flex-1 basis-[14rem]"
                placeholder="Shop name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
              <button
                className="hb-btn hb-btn-primary w-full sm:w-auto"
                disabled={busy}
              >
                {busy ? 'Creating…' : 'Create shop'}
              </button>
            </form>
          </section>
        ) : null}

        <section className="hb-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1 text-sm">
              Search
              <input
                className="hb-input mt-1.5"
                placeholder="Search name, address…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <div className="min-w-[10rem]">
              <SelectInput
                label="Status"
                value={status}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                onChange={setStatus}
              />
            </div>
          </div>

          <div className="hb-data-table-wrap mt-4">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Open jobs</th>
                  <th>Fulfillments</th>
                  <th>Products</th>
                  <th>Logins</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Overview</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="font-semibold">{row.name}</div>
                      <div className="text-xs text-[var(--hb-ink)]/45">
                        {row.address || 'No address'}
                      </div>
                    </td>
                    <td className="tabular-nums">{row.openFulfillments}</td>
                    <td className="tabular-nums">{row.fulfillmentCount}</td>
                    <td className="tabular-nums">{row.productCount}</td>
                    <td className="tabular-nums">{row.loginCount}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`${base}/shops/${row.id}`}
                        className="text-sm font-semibold text-[var(--hb-green)] hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-[var(--hb-ink)]/55">
                      No partner shops found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
