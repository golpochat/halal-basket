import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatDriverFeedbackTag,
  formatFulfillmentStatus,
  formatPaymentStatus,
} from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type DriverOverview = {
  driver: {
    id: string;
    name: string;
    phone: string | null;
    email: string;
    isActive: boolean;
  };
  summary: {
    openFulfillments: number;
    totalJobs: number;
    delivered: number;
    deliveryRate: number;
    byStatus: Record<string, number>;
    avgRating: number | null;
    feedbackCount: number;
    payments: {
      paid: number;
      pending: number;
      failed: number;
      refunded: number;
    };
  };
  recentJobs: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop: { id: string; name: string };
    order: {
      id: string;
      paymentStatus: string;
      totalAmount: number;
      customerName: string | null;
    };
    lineTotal: number;
    itemCount: number;
  }>;
  recentFeedback: Array<{
    id: string;
    rating: number;
    tags: string[];
    suggestBlock: boolean;
    createdAt: string;
    orderId: string;
    fulfillmentId: string | null;
    customer: { id: string; name: string };
  }>;
};

function formatFeedbackWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function AdminDriverOverviewPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['drivers.read']}>
        <DriverOverviewInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function DriverOverviewInner() {
  const { driverId } = useParams<{ driverId: string }>();
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const base = isSuper ? '/super-admin' : '/admin';
  const permissions = session!.permissions ?? [];
  const canSeeDrivers = isSuper || permissions.includes('drivers.read');
  const canSeeShops = isSuper || permissions.includes('shops.read');
  const canSeeOps = isSuper || permissions.includes('ops.read');
  const [error, setError] = useState('');
  const [data, setData] = useState<DriverOverview | null>(null);

  useEffect(() => {
    if (!driverId) return;
    api<DriverOverview>(`/admin/drivers/${driverId}/overview`, { token })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [driverId, token]);

  return (
    <>
      <p className="text-sm text-[var(--hb-ink)]/55">
        {canSeeDrivers ? (
          <Link to={`${base}/driver-activity`} className="hover:underline">
            Driver activity
          </Link>
        ) : (
          'Driver activity'
        )}
        {data ? ` / ${data.driver.name}` : ''}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {data?.driver.name ?? 'Driver overview'}
      </h1>
      {data ? (
        <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
          {data.driver.email}
          {data.driver.phone ? ` · ${data.driver.phone}` : ''} ·{' '}
          {data.driver.isActive ? 'Active' : 'Inactive'}
        </p>
      ) : null}

      <div className="mt-6">
        <Flash error={error} />
        {!data && !error ? (
          <p className="text-sm text-[var(--hb-ink)]/55">Loading…</p>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Open jobs"
                value={String(data.summary.openFulfillments)}
              />
              <Stat
                label="Delivery rate"
                value={`${data.summary.deliveryRate}%`}
                detail={`${data.summary.delivered} of ${data.summary.totalJobs} jobs`}
              />
              <Stat
                label="Avg rating"
                value={
                  data.summary.avgRating != null
                    ? String(data.summary.avgRating)
                    : '—'
                }
                detail={`${data.summary.feedbackCount} feedback`}
              />
              <Stat
                label="Paid orders"
                value={String(data.summary.payments.paid)}
                detail={`${data.summary.payments.pending} pending · ${data.summary.payments.refunded} refunded`}
              />
            </section>

            <section className="hb-surface mt-6 p-5 shadow-sm">
              <h2 className="font-semibold">Jobs by status</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(data.summary.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <li
                      key={status}
                      className="flex justify-between rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.12)] px-3 py-2 text-sm"
                    >
                      <span className="text-[var(--hb-ink)]/70">
                        {formatFulfillmentStatus(status)}
                      </span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </li>
                  ))}
                {Object.keys(data.summary.byStatus).length === 0 ? (
                  <li className="text-sm text-[var(--hb-ink)]/55">
                    No jobs yet.
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="hb-surface mt-6 p-5 shadow-sm">
              <h2 className="font-semibold">Rating history</h2>
              <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                Recent driver feedback (newest first). Suggest-block flags are
                highlighted for ops review.
              </p>
              <div className="hb-data-table-wrap mt-4">
                <table className="hb-data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Rating</th>
                      <th>Tags</th>
                      <th>Customer</th>
                      <th>Order</th>
                      <th>Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentFeedback ?? []).map((f) => (
                      <tr key={f.id}>
                        <td className="whitespace-nowrap text-sm">
                          {formatFeedbackWhen(f.createdAt)}
                        </td>
                        <td className="tabular-nums font-semibold">
                          {f.rating}/5
                        </td>
                        <td>
                          {f.tags.length === 0 ? (
                            <span className="text-[var(--hb-ink)]/45">—</span>
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {f.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md bg-[rgba(26,92,58,0.08)] px-1.5 py-0.5 text-xs text-[var(--hb-ink)]/75"
                                >
                                  {formatDriverFeedbackTag(tag)}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td>{f.customer.name || '—'}</td>
                        <td>
                          {canSeeOps ? (
                            <Link
                              to={`${base}/ops?orderId=${f.orderId}`}
                              className="font-mono text-xs text-[var(--hb-green)] hover:underline"
                              title={f.orderId}
                            >
                              {f.orderId.slice(0, 8)}…
                            </Link>
                          ) : (
                            <span
                              className="font-mono text-xs"
                              title={f.orderId}
                            >
                              {f.orderId.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                        <td>
                          {f.suggestBlock ? (
                            <span className="text-xs font-semibold text-[var(--hb-danger,#b42318)]">
                              Suggest block
                            </span>
                          ) : (
                            <span className="text-[var(--hb-ink)]/45">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(data.recentFeedback ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-[var(--hb-ink)]/55">
                          No feedback submitted for this driver yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="hb-surface mt-6 p-5 shadow-sm">
              <h2 className="font-semibold">Recent jobs</h2>
              <div className="hb-data-table-wrap mt-4">
                <table className="hb-data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Shop</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Lines</th>
                      <th>Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentJobs.map((f) => (
                      <tr key={f.id}>
                        <td>{f.order.customerName ?? '—'}</td>
                        <td>
                          {canSeeShops ? (
                            <Link
                              to={`${base}/shops/${f.shop.id}`}
                              className="text-[var(--hb-green)] hover:underline"
                            >
                              {f.shop.name}
                            </Link>
                          ) : (
                            f.shop.name
                          )}
                        </td>
                        <td>{formatFulfillmentStatus(f.status)}</td>
                        <td>{formatPaymentStatus(f.order.paymentStatus)}</td>
                        <td className="tabular-nums">
                          €{f.lineTotal.toFixed(2)}
                          <span className="text-xs text-[var(--hb-ink)]/45">
                            {' '}
                            · {f.itemCount} items
                          </span>
                        </td>
                        <td>
                          {canSeeOps ? (
                            <Link
                              to={`${base}/ops?orderId=${f.order.id}`}
                              className="font-mono text-xs text-[var(--hb-green)] hover:underline"
                              title={f.order.id}
                            >
                              {f.order.id.slice(0, 8)}…
                            </Link>
                          ) : (
                            <span
                              className="font-mono text-xs"
                              title={f.order.id}
                            >
                              {f.order.id.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.recentJobs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-[var(--hb-ink)]/55">
                          No jobs for this driver yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="hb-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55">{detail}</p>
      ) : null}
    </div>
  );
}
