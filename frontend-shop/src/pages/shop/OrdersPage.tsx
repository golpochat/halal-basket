import { useEffect, useMemo, useState } from 'react';
import { ICON_SIZES, UtilityIcons } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Driver = { id: string; name: string; phone: string | null };
type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  driverId: string | null;
  driver?: { name: string } | null;
  order: { id: string; fulfillmentMode: string; customer?: { name: string } };
};

const STATUSES = [
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

const PAGE_SIZE = 10;

export function ShopOrdersPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);

  async function refresh() {
    const [o, d] = await Promise.all([
      api<Fulfillment[]>('/shop-portal/orders', { token }),
      api<Driver[]>('/shop-portal/drivers', { token }),
    ]);
    setOrders(o);
    setDrivers(d);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [token]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function setStatus(id: string, status: string) {
    setError('');
    setMsg('');
    try {
      await api(`/shop-portal/orders/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      await refresh();
      setMsg('Status updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function assign(id: string) {
    const driverId = selectedDriver[id] || drivers[0]?.id;
    if (!driverId) {
      setError('No drivers available — ask super-admin to create one');
      return;
    }
    try {
      await api(`/shop-portal/orders/${id}/assign-driver`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ driverId }),
      });
      await refresh();
      setMsg('Driver assigned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed');
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-[var(--hb-ink)]/55">
          {orders.length} total · {PAGE_SIZE} per page
        </p>
        <button
          type="button"
          className="hb-icon-btn"
          aria-label="Refresh orders"
          title="Refresh"
          onClick={() => refresh().catch((e) => setError(e.message))}
        >
          {UtilityIcons.refresh({ size: ICON_SIZES.sm })}
        </button>
      </div>

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

      <div className="hb-data-table-wrap">
        <table className="hb-data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Delivery</th>
              <th>Driver</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((f) => (
              <tr key={f.id}>
                <td className="font-semibold">
                  {f.order.customer?.name ?? 'Customer'}
                </td>
                <td>{f.status.replaceAll('_', ' ')}</td>
                <td className="text-[var(--hb-ink)]/65">
                  {f.order.fulfillmentMode.replaceAll('_', ' ')}
                </td>
                <td className="text-[var(--hb-ink)]/65">
                  {f.deliveryDate
                    ? new Date(f.deliveryDate).toLocaleDateString()
                    : '—'}
                </td>
                <td className="text-[var(--hb-ink)]/65">
                  {f.driver?.name ??
                    (f.driverId ? 'Assigned' : 'Unassigned')}
                </td>
                <td>
                  <div className="hb-data-table__actions">
                    <select
                      className="hb-input w-auto py-1.5 text-xs"
                      value={f.status}
                      onChange={(e) => setStatus(f.id, e.target.value)}
                      aria-label={`Status for ${f.order.customer?.name ?? 'order'}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <select
                      className="hb-input w-auto min-w-[7rem] py-1.5 text-xs"
                      value={selectedDriver[f.id] ?? drivers[0]?.id ?? ''}
                      onChange={(e) =>
                        setSelectedDriver((m) => ({
                          ...m,
                          [f.id]: e.target.value,
                        }))
                      }
                      aria-label={`Driver for ${f.order.customer?.name ?? 'order'}`}
                    >
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="hb-icon-btn hb-icon-btn--primary"
                      aria-label={`Assign driver for ${f.order.customer?.name ?? 'order'}`}
                      title="Assign driver"
                      onClick={() => assign(f.id)}
                    >
                      {UtilityIcons.locate({ size: ICON_SIZES.sm })}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-[var(--hb-ink)]/55">
                  No orders yet.
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
          <button
            type="button"
            className="hb-icon-btn"
            aria-label="Previous page"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
          </button>
          <button
            type="button"
            className="hb-icon-btn"
            aria-label="Next page"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
          </button>
        </div>
      </div>
    </div>
  );
}
