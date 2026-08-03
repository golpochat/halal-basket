import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

export function AdminOpsDrillPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <OpsDrillInner />
      </RequireRole>
    </RequireAuth>
  );
}

function OpsDrillInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);

  async function refreshMetrics() {
    const m = await api<Record<string, number>>('/admin/metrics', { token });
    setMetrics(m);
  }

  useEffect(() => {
    refreshMetrics().catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Alert drill
      </h1>
      <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
        Runtime process metrics and alert drills — not business analytics.
      </p>

      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Process metrics</h2>
              <p className="mt-0.5 text-sm text-[var(--hb-ink)]/55">
                In-memory counters for this API process.
              </p>
            </div>
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3.5 py-2 text-sm"
              onClick={() => {
                setError('');
                refreshMetrics().catch((e: Error) => setError(e.message));
              }}
            >
              Refresh
            </button>
          </div>
          {metrics ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(metrics)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.12)] px-3 py-2.5"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                      {key}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--hb-ink)]/55">Loading…</p>
          )}
        </section>

        <section className="hb-surface p-5 shadow-sm">
          <h2 className="font-semibold">Test alert</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Fire a synthetic ops alert to verify alerting wiring.
          </p>
          <button
            type="button"
            className="hb-btn hb-btn-primary mt-4"
            onClick={async () => {
              setError('');
              setMsg('');
              try {
                await api('/admin/ops/test-alert', {
                  method: 'POST',
                  token,
                  body: JSON.stringify({ reason: 'ui-drill' }),
                });
                setMsg('Test alert fired');
                await refreshMetrics();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Failed to fire alert',
                );
              }
            }}
          >
            Fire test alert
          </button>
        </section>
      </div>
    </>
  );
}
