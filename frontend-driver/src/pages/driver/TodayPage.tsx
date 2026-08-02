import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ICON_SIZES,
  IconButton,
  StatusBadge,
  Tooltip,
  UtilityIcons,
  formatFulfillmentMode,
  toastError,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  shop?: { name: string; address: string | null };
  order: {
    id: string;
    fulfillmentMode: string;
    customer?: { name: string };
  };
};

const PAGE_SIZE = 10;

export function DriverTodayPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [page, setPage] = useState(1);

  async function refresh() {
    const list = await api<Fulfillment[]>('/driver/orders/today', {
      token: session!.accessToken,
    });
    setOrders(list);
  }

  useEffect(() => {
    refresh().catch((e) => toastError(e, "Could not load today's deliveries"));
  }, [session]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-[var(--hb-ink)]/55">
          {orders.length} deliveries today · {PAGE_SIZE} per page
        </p>
        <IconButton
          label="Refresh deliveries"
          tooltip="Refresh"
          onClick={() =>
            refresh().catch((e) =>
              toastError(e, "Could not refresh today's deliveries"),
            )
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
              <th>Shop</th>
              <th>Mode</th>
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
                  {f.shop?.name ?? 'Shop'}
                </td>
                <td className="text-[var(--hb-ink)]/65">
                  {formatFulfillmentMode(f.order.fulfillmentMode)}
                </td>
                <td>
                  <div className="hb-data-table__actions">
                    <Tooltip content="View detail">
                      <Link
                        to={`/driver/orders/${f.id}`}
                        className="hb-icon-btn"
                        aria-label={`View delivery for ${f.order.customer?.name ?? 'customer'}`}
                      >
                        {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
                      </Link>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-[var(--hb-ink)]/55">
                  No deliveries assigned for today.
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
