import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  formatFulfillmentMode,
  formatOrderStatus,
  formatPaymentStatus,
  toastError,
  useCartStore,
  useToastStore,
  type CustomerAddress,
} from "@halal-basket/web";
import { useAuth } from "../../auth/AuthContext";
import { useLocale } from "../../locale/LocaleContext";
import { api } from "../../lib/api";
import { loadOrderIntoCart } from "../../lib/reorder";

type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  product?: { id: string; name: string; imageUrl?: string | null } | null;
};

type Order = {
  id: string;
  status: string;
  paymentStatus?: string;
  fulfillmentMode: string;
  totalAmount: string | number;
  createdAt?: string;
  deliveryAreaName?: string | null;
  items?: OrderItem[];
  fulfillments?: Array<{
    deliveryDate: string | null;
    shop?: { name: string } | null;
  }>;
};

type Profile = {
  name: string | null;
  email: string;
  addressList?: CustomerAddress[];
};

const ADDRESS_LABEL_KEYS: Record<string, string> = {
  Home: "addresses.label.home",
  Work: "addresses.label.work",
  Family: "addresses.label.family",
  Other: "addresses.label.other",
};

function defaultAddress(list: CustomerAddress[] | undefined) {
  if (!list?.length) return null;
  return list.find((a) => a.isDefault) ?? list[0] ?? null;
}

/** Keep the greeting name emphasized when it appears in the translated string. */
function WelcomeLine({ name, text }: { name: string; text: string }) {
  const idx = name ? text.indexOf(name) : -1;
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-medium text-[var(--hb-ink)]">{name}</span>
      {text.slice(idx + name.length)}
    </>
  );
}

export function CustomerDashboardPage() {
  const { session } = useAuth();
  const { formatMoney, t, languageCode } = useLocale();
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.toast);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const token = session!.accessToken;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Profile>("/auth/me", { token }),
      api<Order[]>("/customers/me/orders", { token }),
    ])
      .then(([p, o]) => {
        if (cancelled) return;
        setProfile(p);
        setOrders(o);
      })
      .catch((e: unknown) => {
        if (!cancelled) toastError(e, t("dashboard.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const recent = useMemo(() => (orders ?? []).slice(0, 5), [orders]);
  const address = defaultAddress(profile?.addressList);
  const greetingName =
    profile?.name?.trim() ||
    session?.user.email?.split("@")[0] ||
    t("dashboard.greetingFallback");

  function displayAddressLabel(label: string) {
    const key = ADDRESS_LABEL_KEYS[label];
    return key ? t(key) : label;
  }

  function onReorder(order: Order) {
    if (order.paymentStatus !== "paid" || order.status === "cancelled") {
      toast(t("dashboard.reorderEmpty"), "error");
      return;
    }
    const items = order.items ?? [];
    if (items.length === 0) {
      toast(t("dashboard.reorderEmpty"), "error");
      return;
    }
    setReorderingId(order.id);
    const added = loadOrderIntoCart(items);
    setReorderingId(null);
    if (added === 0) {
      toast(t("dashboard.reorderFailed"), "error");
      return;
    }
    toast(t("dashboard.reorderAdded", { count: added }));
    setCartOpen(true);
    navigate("/");
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--hb-ink)]/60">
          <WelcomeLine
            name={greetingName}
            text={t("dashboard.welcome", { name: greetingName })}
          />
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="hb-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              {t("dashboard.previousPurchases")}
            </h2>
            <Link
              to="/customer/orders"
              className="text-sm font-medium text-[var(--hb-green)]"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            {t("dashboard.reorderHint")}
          </p>

          {!orders ? (
            <p className="mt-4 text-sm text-[var(--hb-ink)]/55">
              {t("dashboard.loadingOrders")}
            </p>
          ) : recent.length === 0 ? (
            <div className="mt-4 rounded-xl bg-[var(--hb-mist)]/60 px-4 py-5">
              <p className="text-sm text-[var(--hb-ink)]/70">
                {t("dashboard.noOrders")}
              </p>
              <Link
                to="/"
                className="mt-3 inline-block text-sm font-medium text-[var(--hb-green)]"
              >
                {t("dashboard.continueShopping")}
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[rgba(26,92,58,0.1)]">
              {recent.map((order) => {
                const shopName = order.fulfillments?.[0]?.shop?.name;
                const deliveryDate = order.fulfillments?.[0]?.deliveryDate;
                const itemCount =
                  order.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
                const paid = order.paymentStatus === "paid";
                const ref = order.id.slice(0, 8).toUpperCase();
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        <span className="font-mono tracking-wide">{ref}</span>
                        {" · "}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString(
                              languageCode,
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}{" "}
                        · {formatMoney(Number(order.totalAmount))}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--hb-ink)]/55">
                        <span className="font-medium text-[var(--hb-ink)]/70">
                          {formatOrderStatus(order.status, languageCode)}
                        </span>
                        {" · "}
                        {formatPaymentStatus(
                          order.paymentStatus ?? "pending",
                          languageCode,
                        )}
                        {" · "}
                        {formatFulfillmentMode(
                          order.fulfillmentMode,
                          languageCode,
                        )}
                        {itemCount > 0
                          ? ` · ${t("dashboard.itemsSuffix", { count: itemCount })}`
                          : ""}
                        {shopName ? ` · ${shopName}` : ""}
                        {deliveryDate
                          ? ` · ${new Date(deliveryDate).toLocaleDateString(languageCode)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!paid ? (
                        <Link
                          to={`/orders/${order.id}/confirmation`}
                          className="hb-btn hb-btn-ghost h-9 px-3 text-sm font-semibold text-[var(--hb-green)]"
                        >
                          {t("orders.payNow")}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
                          disabled={reorderingId === order.id}
                          onClick={() => onReorder(order)}
                        >
                          {reorderingId === order.id
                            ? t("dashboard.loading")
                            : t("dashboard.reorder")}
                        </button>
                      )}
                      <Link
                        to={`/customer/orders/${order.id}`}
                        className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
                      >
                        {t("dashboard.details")}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hb-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{t("dashboard.deliveryAddress")}</h2>
            <Link
              to="/customer/addresses"
              className="text-sm font-medium text-[var(--hb-green)]"
            >
              {t("dashboard.manage")}
            </Link>
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            {t("dashboard.defaultAddressHint")}
          </p>

          {!profile ? (
            <p className="mt-4 text-sm text-[var(--hb-ink)]/55">
              {t("dashboard.loading")}
            </p>
          ) : address ? (
            <div className="mt-4 rounded-xl bg-[var(--hb-mist)]/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                {displayAddressLabel(address.label)}
                {address.isDefault ? ` · ${t("dashboard.defaultSuffix")}` : ""}
              </p>
              <p className="mt-1 text-sm font-medium">{address.line1}</p>
              <p className="text-sm text-[var(--hb-ink)]/65">
                {address.eircode} · {address.area_name}
              </p>
              <Link
                to="/"
                className="mt-3 inline-block text-sm font-medium text-[var(--hb-green)]"
              >
                {t("dashboard.continueShopping")}
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-[var(--hb-mist)]/60 px-4 py-5">
              <p className="text-sm text-[var(--hb-ink)]/70">
                {t("dashboard.noAddress")}
              </p>
              <Link
                to="/customer/addresses"
                className="mt-3 inline-block text-sm font-medium text-[var(--hb-green)]"
              >
                {t("dashboard.addAddress")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
