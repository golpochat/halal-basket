import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type CustomerRow = {
  id: string;
  name: string;
  isBlocked: boolean;
  user: { email: string; phone: string | null; isActive: boolean };
};

type PrivacySummary = {
  customerId: string;
  name: string;
  email: string;
  phone: string | null;
  isBlocked: boolean;
  isActive: boolean;
  alreadyErased: boolean;
  orderCount: number;
  paidOrders: number;
  pendingPayments: number;
  openFulfillments: number;
  canErase: boolean;
  blockers: string[];
  note: string;
};

export function AdminGdprPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['gdpr.read']}>
        <GdprInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function GdprInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canErase =
    isSuper || (session!.permissions ?? []).includes('gdpr.write');

  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkId = searchParams.get('customerId') ?? '';

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(deepLinkId);
  const [summary, setSummary] = useState<PrivacySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setCustomers(await api<CustomerRow[]>('/admin/customers', { token }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load customers');
      }
    })();
  }, [token]);

  const loadSummary = useCallback(
    async (id: string) => {
      if (!id.trim()) {
        setSummary(null);
        return;
      }
      setError('');
      setBusy(true);
      try {
        const s = await api<PrivacySummary>(
          `/admin/customers/${id}/privacy`,
          { token },
        );
        setSummary(s);
        setConfirmText('');
      } catch (err) {
        setSummary(null);
        setError(err instanceof Error ? err.message : 'Customer not found');
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (deepLinkId) void loadSummary(deepLinkId);
  }, [deepLinkId, loadSummary]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers.slice(0, 40);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.user.email.toLowerCase().includes(needle) ||
          c.id.toLowerCase().includes(needle) ||
          (c.user.phone ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [customers, q]);

  function selectCustomer(id: string) {
    setSelectedId(id);
    setSearchParams(id ? { customerId: id } : {});
    void loadSummary(id);
  }

  async function exportSelected() {
    if (!summary) return;
    setError('');
    setMsg('');
    setBusy(true);
    try {
      const data = await api<unknown>(
        `/admin/customers/${summary.customerId}/export`,
        { token },
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-export-${summary.customerId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Export downloaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function eraseSelected() {
    if (!summary || !canErase) return;
    if (confirmText.trim() !== 'ERASE') {
      setError('Type ERASE to confirm');
      return;
    }
    setError('');
    setMsg('');
    setBusy(true);
    try {
      const res = await api<{ message?: string }>(
        `/admin/customers/${summary.customerId}/erase`,
        { method: 'POST', token },
      );
      setMsg(res.message ?? 'Customer erased');
      setConfirmText('');
      await loadSummary(summary.customerId);
      setCustomers(await api<CustomerRow[]>('/admin/customers', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erase failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Privacy
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--hb-ink)]/60">
        Export customer data or anonymize personal details. Orders and payment
        history are kept for accounting — erase does not delete financial
        records.
      </p>

      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Find customer</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Search by name, email, phone, or paste a customer UUID.
          </p>
          <input
            className="hb-input mt-3 w-full max-w-xl"
            placeholder="Search customers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="hb-input min-w-0 flex-1"
              placeholder="Customer UUID"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            />
            <button
              type="button"
              className="hb-btn hb-btn-ghost"
              disabled={busy || !selectedId.trim()}
              onClick={() => selectCustomer(selectedId.trim())}
            >
              Load
            </button>
          </div>

          {filtered.length > 0 ? (
            <ul className="mt-4 max-h-56 divide-y divide-[var(--hb-ink)]/10 overflow-y-auto text-sm">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-2 py-2 text-left hover:bg-[var(--hb-ink)]/[0.04] ${
                      selectedId === c.id ? 'bg-[var(--hb-ink)]/[0.06]' : ''
                    }`}
                    onClick={() => selectCustomer(c.id)}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[var(--hb-ink)]/55">
                      {c.user.email}
                      {c.isBlocked ? ' · blocked' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--hb-ink)]/50">
              {customers.length === 0 ? 'No customers loaded.' : 'No matches.'}
            </p>
          )}
        </section>

        {summary ? (
          <section className="hb-surface mb-8 p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold">
              {summary.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
              {summary.email}
              {summary.phone ? ` · ${summary.phone}` : ''}
            </p>
            <p className="mt-3 text-xs text-[var(--hb-ink)]/45">
              ID {summary.customerId}
            </p>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Orders" value={String(summary.orderCount)} />
              <Stat label="Paid" value={String(summary.paidOrders)} />
              <Stat
                label="Unsettled payment"
                value={String(summary.pendingPayments)}
              />
              <Stat
                label="Open fulfillments"
                value={String(summary.openFulfillments)}
              />
            </dl>

            <p className="mt-4 text-sm text-[var(--hb-ink)]/60">{summary.note}</p>

            {summary.blockers.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {summary.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="hb-btn"
                disabled={busy || summary.alreadyErased}
                onClick={() => void exportSelected()}
              >
                Download export
              </button>
            </div>

            {canErase ? (
              <div className="mt-8 border-t border-[var(--hb-ink)]/10 pt-5">
                <h3 className="font-display text-lg font-semibold">
                  Anonymize (erase)
                </h3>
                <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                  Clears name, email, phone, addresses, and login. Retains order
                  and payment rows without delivery address. Blocked while
                  fulfillments or payments are still open.
                </p>
                {summary.canErase ? (
                  <div className="mt-3 flex max-w-md flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className="hb-input flex-1"
                      placeholder='Type ERASE to confirm'
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost"
                      disabled={busy || confirmText.trim() !== 'ERASE'}
                      onClick={() => void eraseSelected()}
                    >
                      Erase
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--hb-ink)]/50">
                    Resolve blockers above before erase is available.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[var(--hb-ink)]/50">
                You can export data. Erase requires the{' '}
                <code className="text-xs">gdpr.write</code> permission.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--hb-ink)]/45">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
