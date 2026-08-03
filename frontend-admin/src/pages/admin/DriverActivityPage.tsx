import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectInput } from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type DriverRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  isActive: boolean;
  fulfillmentCount: number;
  feedbackCount: number;
  openFulfillments: number;
};

export function AdminDriverActivityPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['drivers.read']}>
        <DriverActivityInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function DriverActivityInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const base = isSuper ? '/super-admin' : '/admin';
  const [error, setError] = useState('');
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    api<DriverRow[]>('/admin/drivers/directory', { token })
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === 'active' && !r.isActive) return false;
      if (status === 'inactive' && r.isActive) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        (r.phone ?? '').toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Driver activity
      </h1>
      <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
        Open a driver overview for assigned jobs, delivery rate, and related
        order payments. Login accounts are managed under Driver logins.
      </p>

      <div className="mt-6">
        <Flash error={error} />

        <section className="hb-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1 text-sm">
              Search
              <input
                className="hb-input mt-1.5"
                placeholder="Search name, email…"
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
                  <th>Driver</th>
                  <th>Open jobs</th>
                  <th>Total jobs</th>
                  <th>Feedback</th>
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
                        {row.email}
                        {row.phone ? ` · ${row.phone}` : ''}
                      </div>
                    </td>
                    <td className="tabular-nums">{row.openFulfillments}</td>
                    <td className="tabular-nums">{row.fulfillmentCount}</td>
                    <td className="tabular-nums">{row.feedbackCount}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`${base}/driver-activity/${row.id}`}
                        className="text-sm font-semibold text-[var(--hb-green)] hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-[var(--hb-ink)]/55">
                      No drivers found.
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
