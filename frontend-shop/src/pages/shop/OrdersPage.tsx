import { useEffect, useMemo, useState } from 'react';
import {
  ICON_SIZES,
  IconButton,
  MenuSelect,
  StatusBadge,
  UtilityIcons,
  formatFulfillmentMode,
  formatFulfillmentStatus,
  toastError,
  toastSuccess,
} from '@halal-basket/web';
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
  'failed_attempt',
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
    refresh().catch((e) => toastError(e, 'Could not load orders'));
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
    try {
      await api(`/shop-portal/orders/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      await refresh();
      toastSuccess('Status updated');
    } catch (e) {
      toastError(e, 'Could not update status');
    }
  }

  async function assign(id: string) {
    const driverId = selectedDriver[id] || drivers[0]?.id;
    if (!driverId) {
      toastError('No drivers available - ask a super-admin to create one');
      return;
    }
    try {
      await api(`/shop-portal/orders/${id}/assign-driver`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ driverId }),
      });
      await refresh();
      toastSuccess('Driver assigned');
    } catch (e) {
      toastError(e, 'Could not assign driver');
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-[var(--hb-ink)]/55">
          {orders.length} total · {PAGE_SIZE} per page
        </p>
        <IconButton
          label="Refresh orders"
          tooltip="Refresh"
          onClick={() =>
            refresh().catch((e) => toastError(e, 'Could not refresh orders'))
          }
        >
          {UtilityIcons.refresh({ size: ICON_SIZES.sm })}
        </IconButton>
      </div>

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
                <td>
                  <StatusBadge status={f.status} />
                </td>
                <td className="text-[var(--hb-ink)]/65">
                  {formatFulfillmentMode(f.order.fulfillmentMode)}
                </td>
                <td className="text-[var(--hb-ink)]/65">
                  {f.deliveryDate
                    ? new Date(f.deliveryDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="text-[var(--hb-ink)]/65">
                  {f.driver?.name ??
                    (f.driverId ? 'Assigned' : 'Unassigned')}
                </td>
                <td>
                  <div className="hb-data-table__actions">
                    <MenuSelect
                      label={`Status for ${f.order.customer?.name ?? 'order'}`}
                      value={f.status}
                      options={STATUSES.map((s) => ({
                        value: s,
                        label: formatFulfillmentStatus(s),
                      }))}
                      onChange={(value) => void setStatus(f.id, value)}
                      triggerClassName="min-w-[7.5rem] text-xs shadow-none"
                    />
                    <MenuSelect
                      label={`Driver for ${f.order.customer?.name ?? 'order'}`}
                      value={selectedDriver[f.id] ?? drivers[0]?.id ?? ''}
                      options={drivers.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                      onChange={(value) =>
                        setSelectedDriver((m) => ({
                          ...m,
                          [f.id]: value,
                        }))
                      }
                      triggerClassName="min-w-[7.5rem] text-xs shadow-none"
                      disabled={drivers.length === 0}
                    />
                    <IconButton
                      label={`Assign driver for ${f.order.customer?.name ?? 'order'}`}
                      tooltip="Assign driver"
                      tone="primary"
                      onClick={() => assign(f.id)}
                    >
                      {UtilityIcons.locate({ size: ICON_SIZES.sm })}
                    </IconButton>
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
    </div>
  );
}
