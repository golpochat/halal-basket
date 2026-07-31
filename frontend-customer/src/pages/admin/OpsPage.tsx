import { FormEvent, useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { AppShell } from '../../components/ui/AppShell';
import { api } from '../../lib/api';

type Customer = {
  id: string;
  name: string;
  isBlocked: boolean;
  riskScore: number;
  user: { email: string };
};

const adminNav = [{ to: '/admin', label: 'Ops', end: true }];

export function AdminOpsPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['admin', 'super_admin']}>
        <OpsInner />
      </RequireRole>
    </RequireAuth>
  );
}

function OpsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function refresh() {
    setCustomers(await api<Customer[]>('/admin/customers', { token }));
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [token]);

  async function toggleBlock(c: Customer) {
    await api(`/admin/customers/${c.id}/block`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ isBlocked: !c.isBlocked }),
    });
    await refresh();
  }

  async function postOrderEvent(kind: 'refund' | 'complaint') {
    if (!orderId.trim()) {
      setError('Order ID required');
      return;
    }
    setError('');
    setMsg('');
    try {
      const res = await api<{ riskScore: number }>(
        `/admin/orders/${orderId}/${kind}`,
        {
          method: 'POST',
          token,
          body: JSON.stringify(
            kind === 'refund'
              ? { reason: 'Admin refund' }
              : { note: 'Admin complaint' },
          ),
        },
      );
      setMsg(`${kind} recorded · risk now ${res.riskScore}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  const nav = isSuper
    ? [
        ...adminNav,
        { to: '/super-admin', label: 'Platform' },
      ]
    : adminNav;

  return (
    <AppShell title="Ops admin" nav={nav} homeTo="/admin">
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

      <section className="hb-surface mb-8 p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">
          Refund / complaint
        </h2>
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
          Paste an order UUID to record an event and update risk.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="hb-input min-w-[16rem] flex-1"
            placeholder="Order UUID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <button
            type="button"
            className="hb-btn hb-btn-ghost"
            onClick={() => postOrderEvent('refund')}
          >
            Record refund
          </button>
          <button
            type="button"
            className="hb-btn hb-btn-ghost"
            onClick={() => postOrderEvent('complaint')}
          >
            Record complaint
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Customers</h2>
        <ul className="mt-3 space-y-2">
          {customers.map((c) => (
            <li
              key={c.id}
              className="hb-surface flex flex-wrap items-center justify-between gap-2 p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-[var(--hb-ink)]/50">
                  {c.user.email} · risk {c.riskScore}
                  {c.isBlocked ? ' · BLOCKED' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="hb-btn hb-btn-ghost py-2 text-sm"
                  onClick={async () => {
                    const r = await api<{ riskScore: number }>(
                      `/admin/customers/${c.id}/recalculate-risk`,
                      { method: 'POST', token },
                    );
                    setMsg(`Risk recalculated: ${r.riskScore}`);
                    await refresh();
                  }}
                >
                  Recalc risk
                </button>
                <button
                  type="button"
                  className="hb-btn hb-btn-primary py-2 text-sm"
                  onClick={() => toggleBlock(c)}
                >
                  {c.isBlocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            </li>
          ))}
          {customers.length === 0 && (
            <p className="text-[var(--hb-ink)]/55">No customers yet.</p>
          )}
        </ul>
      </section>
    </AppShell>
  );
}

// silence unused FormEvent if any
void (0 as unknown as FormEvent);
