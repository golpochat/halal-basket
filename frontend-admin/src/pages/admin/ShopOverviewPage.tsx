import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatFulfillmentStatus,
  formatPaymentStatus,
} from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type ShopOverview = {
  shop: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    loginCount: number;
    productCount: number;
  };
  summary: {
    openFulfillments: number;
    totalFulfillments: number;
    byStatus: Record<string, number>;
    attributedGmv: number;
    payments: {
      paid: number;
      pending: number;
      failed: number;
      refunded: number;
    };
  };
  recentFulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    driver: { id: string; name: string } | null;
    order: {
      id: string;
      paymentStatus: string;
      totalAmount: number;
      fulfillmentMode: string;
      customerName: string | null;
    };
    lineTotal: number;
    itemCount: number;
  }>;
};

export function AdminShopOverviewPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['shops.read']}>
        <ShopOverviewInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function ShopOverviewInner() {
  const { shopId } = useParams<{ shopId: string }>();
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const base = isSuper ? '/super-admin' : '/admin';
  const permissions = session!.permissions ?? [];
  const canSeeShops = isSuper || permissions.includes('shops.read');
  const canSeeDrivers = isSuper || permissions.includes('drivers.read');
  const canSeeOps = isSuper || permissions.includes('ops.read');
  const [error, setError] = useState('');
  const [data, setData] = useState<ShopOverview | null>(null);

  useEffect(() => {
    if (!shopId) return;
    api<ShopOverview>(`/admin/shops/${shopId}/overview`, { token })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [shopId, token]);

  return (
    <>
      <p className="text-sm text-[var(--hb-ink)]/55">
        {canSeeShops ? (
          <Link to={`${base}/shops`} className="hover:underline">
            Partner shops
          </Link>
        ) : (
          'Partner shops'
        )}
        {data ? ` / ${data.shop.name}` : ''}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {data?.shop.name ?? 'Shop overview'}
      </h1>
      {data ? (
        <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
          {data.shop.address || 'No address'} ·{' '}
          {data.shop.isActive ? 'Active' : 'Inactive'} ·{' '}
          {data.shop.productCount} products · {data.shop.loginCount} logins
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
                label="Open fulfillments"
                value={String(data.summary.openFulfillments)}
              />
              <Stat
                label="Total fulfillments"
                value={String(data.summary.totalFulfillments)}
              />
              <Stat
                label="Attributed GMV"
                value={`€${data.summary.attributedGmv.toFixed(2)}`}
                detail="Paid line items for this shop"
              />
              <Stat
                label="Paid orders"
                value={String(data.summary.payments.paid)}
                detail={`${data.summary.payments.pending} pending · ${data.summary.payments.refunded} refunded`}
              />
            </section>

            <section className="hb-surface mt-6 p-5 shadow-sm">
              <h2 className="font-semibold">Fulfillments by status</h2>
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
                    No fulfillments yet.
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="hb-surface mt-6 p-5 shadow-sm">
              <h2 className="font-semibold">Recent fulfillments</h2>
              <div className="hb-data-table-wrap mt-4">
                <table className="hb-data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Shop lines</th>
                      <th>Order total</th>
                      <th>Driver</th>
                      <th>Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFulfillments.map((f) => (
                      <tr key={f.id}>
                        <td>{f.order.customerName ?? '—'}</td>
                        <td>{formatFulfillmentStatus(f.status)}</td>
                        <td>{formatPaymentStatus(f.order.paymentStatus)}</td>
                        <td className="tabular-nums">
                          €{f.lineTotal.toFixed(2)}
                          <span className="text-xs text-[var(--hb-ink)]/45">
                            {' '}
                            · {f.itemCount} items
                          </span>
                        </td>
                        <td className="tabular-nums">
                          €{f.order.totalAmount.toFixed(2)}
                        </td>
                        <td>
                          {f.driver && canSeeDrivers ? (
                            <Link
                              to={`${base}/driver-activity/${f.driver.id}`}
                              className="text-[var(--hb-green)] hover:underline"
                            >
                              {f.driver.name}
                            </Link>
                          ) : (
                            '—'
                          )}
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
                            <span className="font-mono text-xs" title={f.order.id}>
                              {f.order.id.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.recentFulfillments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-[var(--hb-ink)]/55">
                          No fulfillments for this shop yet.
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

