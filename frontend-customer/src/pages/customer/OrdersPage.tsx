import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ICON_SIZES,
  IconButton,
  formatFulfillmentMode,
  formatOrderStatus,
  formatPaymentStatus,
  StatusBadge,
  Tooltip,
  UtilityIcons,
  toastError,
  useCartStore,
  useDashboardTitle,
  useOrderLive,
  useToastStore,
} from "@halal-basket/web";
import { useAuth } from "../../auth/AuthContext";
import { useLocale } from "../../locale/LocaleContext";
import { api } from "../../lib/api";
import { loadOrderIntoCart } from "../../lib/reorder";

type Order = {
  id: string;
  status: string;
  paymentStatus?: string;
  createdAt?: string;
  fulfillmentMode: string;
  totalAmount: string | number;
  discountAmount?: string | number;
  couponCode?: string | null;
  items?: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string | number;
    product?: { name?: string | null; imageUrl?: string | null } | null;
  }>;
  fulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop?: { name: string; address?: string | null };
  }>;
  events?: Array<{ id: string; eventType: string; createdAt: string }>;
};

const PAGE_SIZE = 10;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function orderRef(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function isPaid(order: Pick<Order, "paymentStatus"> | null | undefined) {
  return order?.paymentStatus === "paid";
}

function canReorder(order: Order) {
  return (
    isPaid(order) &&
    order.status !== "cancelled" &&
    (order.items?.length ?? 0) > 0
  );
}

export function OrdersPage() {
  const { session } = useAuth();
  const { formatMoney, t, languageCode } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.toast);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const [order, setOrder] = useState<Order | null>(null);
  const [list, setList] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const token = session!.accessToken;

  const {
    snapshot: live,
    connection,
    lastEventAt,
  } = useOrderLive({
    orderId: id,
    token,
    baseUrl: API_URL,
    enabled: Boolean(id),
  });

  function onReorder(target: Order) {
    if (!canReorder(target)) {
      toast(t("orders.reorderEmpty"), "error");
      return;
    }
    const added = loadOrderIntoCart(target.items ?? []);
    if (added === 0) {
      toast(t("orders.reorderEmpty"), "error");
      return;
    }
    toast(t("orders.reorderAdded", { count: added }));
    setCartOpen(true);
    navigate("/");
  }

  useDashboardTitle(id ? t("orders.statusTitle") : "");

  useEffect(() => {
    if (id) {
      api<Order>(`/orders/${id}`, { token })
        .then(setOrder)
        .catch((e) => toastError(e, t("orders.loadOrderFailed")));
    } else {
      api<Order[]>("/customers/me/orders", { token })
        .then(setList)
        .catch((e) => toastError(e, t("orders.loadListFailed")));
    }
  }, [id, token, t]);

  const totalPages = Math.max(1, Math.ceil((list?.length ?? 0) / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    if (!list) return [];
    const start = (pageSafe - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, pageSafe]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const fulfillments =
    live?.fulfillments ??
    order?.fulfillments.map((f, index, arr) => ({
      id: f.id,
      part: index + 1,
      partsTotal: arr.length,
      shopId: "",
      shopName: f.shop?.name,
      shopAddress: f.shop?.address ?? null,
      status: f.status,
      deliveryDate: f.deliveryDate,
      estimatedDeliveryAt: null as string | null,
    })) ??
    [];

  const fulfillmentMode = live?.fulfillmentMode ?? order?.fulfillmentMode;
  const paymentStatus =
    live?.paymentStatus ?? order?.paymentStatus ?? "pending";
  const paid = paymentStatus === "paid";

  const liveLabel =
    connection === "live"
      ? t("orders.liveInstant")
      : connection === "polling"
        ? t("orders.livePolling")
        : connection === "paused"
          ? t("orders.livePaused")
          : connection === "connecting"
            ? t("orders.liveConnecting")
            : t("orders.liveIssue");

  if (id) {
    return (
      <div>
        <div className="mb-4">
          <Tooltip content={t("orders.backToOrders")}>
            <Link
              to="/customer/orders"
              className="hb-icon-btn inline-flex"
              aria-label={t("orders.backToOrders")}
            >
              {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
            </Link>
          </Tooltip>
        </div>

        {(order || live) && (
          <div className="hb-surface space-y-3 p-6 shadow-sm">
            <p className="text-xs text-[var(--hb-ink)]/45">
              {liveLabel}
              {lastEventAt
                ? ` · ${t("orders.lastEvent", {
                    time: new Date(lastEventAt).toLocaleTimeString(
                      languageCode,
                    ),
                  })}`
                : ""}
            </p>
            <p className="font-mono text-sm font-semibold tracking-wide">
              {orderRef(id)}
            </p>
            {order?.createdAt && (
              <p className="text-sm text-[var(--hb-ink)]/65">
                {t("orders.placedOn")}{" "}
                {new Date(order.createdAt).toLocaleString(languageCode)}
              </p>
            )}
            <p>
              {t("orders.orderLabel")}{" "}
              <strong>
                {formatOrderStatus(
                  live?.status ?? order?.status ?? "",
                  languageCode,
                )}
              </strong>
              {` · ${t("orders.paymentSuffix", {
                status: formatPaymentStatus(paymentStatus, languageCode),
              })}`}
            </p>
            <p>
              {t("orders.mode")}{" "}
              {fulfillmentMode
                ? formatFulfillmentMode(fulfillmentMode, languageCode)
                : ""}
            </p>
            {(live?.splitOrder || fulfillments.length > 1) && (
              <p className="rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm">
                {t("orders.splitBanner", { count: fulfillments.length })}
              </p>
            )}
            {order && (
              <>
                {Number(order.discountAmount ?? 0) > 0 && (
                  <p className="text-sm text-[var(--hb-green)]">
                    {t("orders.discount")}
                    {order.couponCode ? ` (${order.couponCode})` : ""}: −
                    {formatMoney(Number(order.discountAmount))}
                  </p>
                )}
                <p className="font-display text-2xl">
                  {formatMoney(Number(order.totalAmount))}
                </p>
              </>
            )}
            {!paid && (
              <Link
                to={`/orders/${id}/confirmation`}
                className="hb-btn hb-btn-primary inline-flex h-10 items-center justify-center px-4"
              >
                {t("orders.payNow")}
              </Link>
            )}
            <div className="space-y-2 border-t border-[rgba(26,92,58,0.1)] pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                {t("orders.statusTimeline")}
              </p>
              {fulfillments.map((f, index) => (
                <div
                  key={f.id}
                  className="rounded-xl bg-[var(--hb-mist)]/50 px-3 py-2 text-sm"
                >
                  <p>
                    {fulfillments.length > 1
                      ? t("orders.partOf", {
                          part: f.part ?? index + 1,
                          total: f.partsTotal ?? fulfillments.length,
                        })
                      : "Halal Basket"}{" "}
                    ·{" "}
                    <StatusBadge status={f.status} lang={languageCode} />
                  </p>
                  {fulfillmentMode === "pickup" && f.shopAddress && (
                    <p className="text-[var(--hb-ink)]/65">
                      {t("orders.pickupLocation", { address: f.shopAddress })}
                    </p>
                  )}
                  {f.deliveryDate && (
                    <p>
                      {t("orders.delivery")}{" "}
                      {new Date(f.deliveryDate).toLocaleDateString(
                        languageCode,
                      )}
                    </p>
                  )}
                  {f.estimatedDeliveryAt && (
                    <p>
                      {t("orders.eta")}{" "}
                      {new Date(f.estimatedDeliveryAt).toLocaleString(
                        languageCode,
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {order?.events && order.events.length > 0 && (
              <ul className="space-y-1 text-sm text-[var(--hb-ink)]/60">
                {order.events.map((ev) => (
                  <li key={ev.id}>
                    {new Date(ev.createdAt).toLocaleString(languageCode)} —{" "}
                    {ev.eventType}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              {order && canReorder(order) ? (
                <button
                  type="button"
                  className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
                  onClick={() => onReorder(order)}
                >
                  {t("orders.reorder")}
                </button>
              ) : null}
              <Link
                to="/customer/orders"
                className="inline-flex h-9 items-center text-sm font-medium text-[var(--hb-green)]"
              >
                ← {t("orders.backToOrders")}
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {list && (
        <>
          <p className="mb-3 text-sm text-[var(--hb-ink)]/55">
            {t("orders.paginationSummary", {
              total: list.length,
              pageSize: PAGE_SIZE,
            })}
          </p>

          <div className="hb-data-table-wrap">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>{t("orders.col.order")}</th>
                  <th>{t("orders.col.placed")}</th>
                  <th>{t("orders.col.status")}</th>
                  <th>{t("orders.col.payment")}</th>
                  <th>{t("orders.col.mode")}</th>
                  <th>{t("orders.col.total")}</th>
                  <th style={{ textAlign: "right" }}>
                    {t("orders.col.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => {
                  const paidRow = isPaid(o);
                  const ref = orderRef(o.id);
                  const openLabel = paidRow
                    ? t("orders.trackOrder")
                    : t("orders.viewOrder");
                  return (
                    <tr key={o.id}>
                      <td className="font-mono text-xs font-semibold tracking-wide">
                        {ref}
                      </td>
                      <td className="whitespace-nowrap text-[var(--hb-ink)]/65">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString(
                              languageCode,
                            )
                          : "—"}
                      </td>
                      <td className="font-semibold">
                        {formatOrderStatus(o.status, languageCode)}
                      </td>
                      <td>
                        {formatPaymentStatus(
                          o.paymentStatus ?? "pending",
                          languageCode,
                        )}
                      </td>
                      <td className="text-[var(--hb-ink)]/65">
                        {formatFulfillmentMode(
                          o.fulfillmentMode,
                          languageCode,
                        )}
                        {o.fulfillments.length > 1
                          ? ` · ${t("orders.partsSuffix", {
                              count: o.fulfillments.length,
                            })}`
                          : ""}
                      </td>
                      <td>{formatMoney(Number(o.totalAmount))}</td>
                      <td>
                        <div className="hb-data-table__actions">
                          {!paidRow ? (
                            <Link
                              to={`/orders/${o.id}/confirmation`}
                              className="hb-btn hb-btn-ghost h-8 px-2 text-xs font-semibold text-[var(--hb-green)]"
                            >
                              {t("orders.payNow")}
                            </Link>
                          ) : canReorder(o) ? (
                            <button
                              type="button"
                              className="hb-btn hb-btn-ghost h-8 px-2 text-xs"
                              onClick={() => onReorder(o)}
                            >
                              {t("orders.reorder")}
                            </button>
                          ) : null}
                          <Tooltip content={openLabel}>
                            <Link
                              to={`/customer/orders/${o.id}`}
                              className="hb-icon-btn"
                              aria-label={`${openLabel} ${ref}`}
                            >
                              {UtilityIcons.chevronRight({
                                size: ICON_SIZES.sm,
                              })}
                            </Link>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-[var(--hb-ink)]/55">
                      {t("orders.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="hb-pagination">
            <span>
              {t("orders.pageOf", {
                page: pageSafe,
                totalPages,
              })}
            </span>
            <div className="hb-pagination__controls">
              <IconButton
                label={t("orders.prevPage")}
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
              </IconButton>
              <IconButton
                label={t("orders.nextPage")}
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {UtilityIcons.chevronRight({ size: ICON_SIZES.sm })}
              </IconButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
