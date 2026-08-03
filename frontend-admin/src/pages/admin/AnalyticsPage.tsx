import { useEffect, useMemo, useState } from 'react';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { Analytics } from './types';

export function AdminAnalyticsPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['analytics.read']}>
        <AnalyticsInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="hb-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--hb-ink)]">
        {value}
      </p>
      <p className="mt-1.5 text-sm text-[var(--hb-ink)]/55">{detail}</p>
    </div>
  );
}

function BreakdownPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; hint?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="hb-surface p-5 shadow-sm">
      <h2 className="font-semibold text-[var(--hb-ink)]">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[var(--hb-ink)]/70">
                {row.label}
                {row.hint ? (
                  <span className="text-[var(--hb-ink)]/40"> · {row.hint}</span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums text-[var(--hb-ink)]">
                {row.value}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(26,92,58,0.1)]">
              <div
                className="h-full rounded-full bg-[var(--hb-green)] transition-[width] duration-300"
                style={{ width: `${Math.round((row.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-sm text-[var(--hb-ink)]/55">No data yet.</li>
        )}
      </ul>
    </section>
  );
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function AnalyticsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<Analytics>('/admin/analytics/summary', { token })
      .then(setAnalytics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const orderRows = useMemo(() => {
    if (!analytics) return [];
    const other = Math.max(
      0,
      analytics.orders.total -
        analytics.orders.completed -
        analytics.orders.cancelled,
    );
    return [
      { label: 'Completed', value: analytics.orders.completed },
      { label: 'Cancelled', value: analytics.orders.cancelled },
      { label: 'Other / open', value: other },
    ];
  }, [analytics]);

  const fulfillmentRows = useMemo(() => {
    if (!analytics?.fulfillments.byStatus) return [];
    return Object.entries(analytics.fulfillments.byStatus)
      .map(([status, value]) => ({
        label: formatStatus(status),
        value,
        hint: status,
      }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  const fulfillmentTotal = useMemo(
    () => fulfillmentRows.reduce((s, r) => s + r.value, 0),
    [fulfillmentRows],
  );

  const delivered = analytics?.fulfillments.byStatus?.delivered ?? 0;

  return (
    <>
      <p className="text-sm text-[var(--hb-ink)]/60">
        All-time platform snapshot
        {analytics?.generatedAt
          ? ` · updated ${new Date(analytics.generatedAt).toLocaleString()}`
          : ''}
      </p>

      <div className="mt-6">
        <Flash error={error} />

        {loading && !analytics ? (
          <p className="text-sm text-[var(--hb-ink)]/55">Loading analytics…</p>
        ) : null}

        {analytics && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Orders"
                value={String(analytics.orders.total)}
                detail={`${analytics.orders.successRate}% completed`}
              />
              <KpiCard
                label="Revenue"
                value={`€${analytics.payments.revenue.toFixed(2)}`}
                detail={`${analytics.payments.paidOrders} paid · ${analytics.payments.refunds} refunds`}
              />
              <KpiCard
                label="Delivery rate"
                value={`${analytics.fulfillments.deliveryRate}%`}
                detail={
                  fulfillmentTotal > 0
                    ? `${delivered} delivered of ${fulfillmentTotal} fulfillments`
                    : 'No fulfillments yet'
                }
              />
              <KpiCard
                label="Trust"
                value={String(analytics.trust.complaints)}
                detail={`${analytics.trust.blockedCustomers} blocked customers · ${analytics.trust.missingItemReports} missing-item reports`}
              />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <BreakdownPanel title="Orders breakdown" rows={orderRows} />
              <BreakdownPanel
                title="Fulfillments by status"
                rows={fulfillmentRows}
              />
            </section>
          </>
        )}
      </div>
    </>
  );
}
