import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { Analytics } from './types';

export function AdminAnalyticsPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <AnalyticsInner />
      </RequireRole>
    </RequireAuth>
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

function AnalyticsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Analytics>('/admin/analytics/summary', { token }),
      api<Record<string, number>>('/admin/metrics', { token }),
    ])
      .then(([a, m]) => {
        setAnalytics(a);
        setMetrics(m);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Analytics</h1>
      <div className="mt-6">
        <Flash error={error} />

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
      </div>
    </>
  );
}
