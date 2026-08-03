import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ICON_SIZES,
  IconButton,
  UtilityIcons,
  formatOrderStatus,
  formatPaymentStatus,
} from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { Customer, AdminOrder } from './types';

const PAGE_SIZE = 10;

export function AdminOpsPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['ops.read']}>
        <OpsInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function OpsInner() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite = isSuper || (session!.permissions ?? []).includes('ops.write');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderId, setOrderId] = useState('');
  const [orderLookup, setOrderLookup] = useState<AdminOrder | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);

  async function refresh() {
    setCustomers(await api<Customer[]>('/admin/customers', { token }));
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  const linkedOrderId = searchParams.get('orderId')?.trim() ?? '';

  useEffect(() => {
    if (!linkedOrderId) return;
    setOrderId(linkedOrderId);
    void lookupOrder(linkedOrderId);
  }, [linkedOrderId, token]);

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function toggleBlock(c: Customer) {
    await api(`/admin/customers/${c.id}/block`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ isBlocked: !c.isBlocked }),
    });
    await refresh();
  }

  async function lookupOrder(orderIdToLookUp = orderId) {
    const lookupId = orderIdToLookUp.trim();
    if (!lookupId) {
      setError('Order ID required');
      return;
    }
    setError('');
    setMsg('');
    try {
      const order = await api<AdminOrder>(`/admin/orders/${lookupId}`, {
        token,
      });
      setOrderLookup(order);
      setMsg('Order loaded');
    } catch (err) {
      setOrderLookup(null);
      setError(err instanceof Error ? err.message : 'Order not found');
    }
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
      await lookupOrder().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="space-y-8">
      <Flash error={error} msg={msg} />

      <section className="hb-surface p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Order lookup</h2>
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
          Paste an order UUID to view totals, coupon discount, and record
          refund/complaint.
        </p>
        <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            className="hb-input min-w-0 w-full flex-1 basis-[16rem]"
            placeholder="Order UUID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <IconButton
            label="Look up order"
            tooltip="Look up"
            tone="primary"
            onClick={() => void lookupOrder()}
          >
            {UtilityIcons.search({ size: ICON_SIZES.sm })}
          </IconButton>
          {canWrite ? (
            <>
              <IconButton
                label="Record refund"
                onClick={() => void postOrderEvent('refund')}
              >
                {UtilityIcons.refresh({ size: ICON_SIZES.sm })}
              </IconButton>
              <IconButton
                label="Record complaint"
                tone="danger"
                onClick={() => void postOrderEvent('complaint')}
              >
                {UtilityIcons.help({ size: ICON_SIZES.sm })}
              </IconButton>
            </>
          ) : null}
        </div>

        {orderLookup && (
          <div className="mt-5 space-y-2 rounded-lg bg-[var(--hb-mist)]/60 px-4 py-3 text-sm">
            <p className="font-mono text-xs text-[var(--hb-ink)]/50">
              {orderLookup.id}
            </p>
            <p>
              <strong>{orderLookup.customer.name}</strong> ·{' '}
              {orderLookup.customer.user.email}
            </p>
            <p>
              Status <strong>{formatOrderStatus(orderLookup.status)}</strong> · Payment{' '}
              <strong>{formatPaymentStatus(orderLookup.paymentStatus)}</strong> ·{' '}
              {orderLookup.fulfillmentMode.replaceAll('_', ' ')}
              {orderLookup.deliveryAreaName
                ? ` · ${orderLookup.deliveryAreaName}`
                : ''}
            </p>
            <div className="space-y-1 border-t border-[rgba(26,92,58,0.12)] pt-2">
              <p className="flex justify-between gap-4">
                <span>Subtotal</span>
                <span>€{Number(orderLookup.subtotalAmount).toFixed(2)}</span>
              </p>
              {Number(orderLookup.discountAmount) > 0 && (
                <p className="flex justify-between gap-4 text-[var(--hb-green)]">
                  <span>
                    Discount
                    {orderLookup.couponCode
                      ? ` (${orderLookup.couponCode})`
                      : ''}
                  </span>
                  <span>−€{Number(orderLookup.discountAmount).toFixed(2)}</span>
                </p>
              )}
              <p className="flex justify-between gap-4">
                <span>Delivery</span>
                <span>
                  {Number(orderLookup.deliveryFeeAmount) === 0
                    ? 'Free'
                    : `€${Number(orderLookup.deliveryFeeAmount).toFixed(2)}`}
                </span>
              </p>
              <p className="flex justify-between gap-4 font-semibold">
                <span>Total</span>
                <span>€{Number(orderLookup.totalAmount).toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">Customers</h2>
            <p className="text-sm text-[var(--hb-ink)]/55">
              {customers.length} total · {PAGE_SIZE} per page
            </p>
          </div>
        </div>

        <div className="hb-data-table-wrap">
          <table className="hb-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Risk</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td className="text-[var(--hb-ink)]/65">{c.user.email}</td>
                  <td>{c.riskScore}</td>
                  <td>
                    {c.isBlocked ? (
                      <span className="font-semibold text-[var(--hb-error)]">
                        Blocked
                      </span>
                    ) : (
                      <span className="text-[var(--hb-ink)]/55">Active</span>
                    )}
                  </td>
                  <td>
                    {canWrite ? (
                      <div className="hb-data-table__actions">
                        <IconButton
                          label={`Recalculate risk for ${c.name}`}
                          tooltip="Recalculate risk"
                          onClick={async () => {
                            const r = await api<{ riskScore: number }>(
                              `/admin/customers/${c.id}/recalculate-risk`,
                              { method: 'POST', token },
                            );
                            setMsg(`Risk recalculated: ${r.riskScore}`);
                            await refresh();
                          }}
                        >
                          {UtilityIcons.refresh({ size: ICON_SIZES.sm })}
                        </IconButton>
                        <IconButton
                          label={
                            c.isBlocked
                              ? `Unblock ${c.name}`
                              : `Block ${c.name}`
                          }
                          tooltip={c.isBlocked ? 'Unblock' : 'Block'}
                          tone={c.isBlocked ? 'default' : 'danger'}
                          onClick={() => void toggleBlock(c)}
                        >
                          {c.isBlocked
                            ? UtilityIcons.unlock({ size: ICON_SIZES.sm })
                            : UtilityIcons.ban({ size: ICON_SIZES.sm })}
                        </IconButton>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-[var(--hb-ink)]/55">
                    No customers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hb-pagination">
          <span>
            Page {pageSafe} of {totalPages}
          </span>
          <div className="hb-pagination__controls">
            <IconButton
              label="Previous page"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
            </IconButton>
            <IconButton
              label="Next page"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
            </IconButton>
          </div>
        </div>
      </section>
    </div>
  );
}
