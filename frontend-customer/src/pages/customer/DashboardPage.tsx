import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  toastError,
  useCartStore,
  useToastStore,
  type CustomerAddress,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { loadOrderIntoCart } from '../../lib/reorder';

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

function defaultAddress(list: CustomerAddress[] | undefined) {
  if (!list?.length) return null;
  return list.find((a) => a.isDefault) ?? list[0] ?? null;
}

function formatMoney(n: string | number) {
  return `€${Number(n).toFixed(2)}`;
}

export function CustomerDashboardPage() {
  const { session } = useAuth();
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
      api<Profile>('/auth/me', { token }),
      api<Order[]>('/customers/me/orders', { token }),
    ])
      .then(([p, o]) => {
        if (cancelled) return;
        setProfile(p);
        setOrders(o);
      })
      .catch((e: unknown) => {
        if (!cancelled) toastError(e, 'Could not load your dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const recent = useMemo(() => (orders ?? []).slice(0, 5), [orders]);
  const address = defaultAddress(profile?.addressList);
  const greetingName =
    profile?.name?.trim() ||
    session?.user.email?.split('@')[0] ||
    'there';

  function onReorder(order: Order) {
    const items = order.items ?? [];
    if (items.length === 0) {
      toast('This order has no items to reorder', 'error');
      return;
    }
    setReorderingId(order.id);
    const added = loadOrderIntoCart(items);
    setReorderingId(null);
    if (added === 0) {
      toast('Could not load items into your basket', 'error');
      return;
    }
    toast(`Added ${added} item${added === 1 ? '' : 's'} from a previous order`);
    setCartOpen(true);
    navigate('/');
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--hb-ink)]/60">
          Welcome, <span className="font-medium text-[var(--hb-ink)]">{greetingName}</span>.
          Pick up where you left off.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="hb-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Previous purchases</h2>
            <Link
              to="/customer/orders"
              className="text-sm font-medium text-[var(--hb-green)]"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Reorder a past basket or open live status.
          </p>

          {!orders ? (
            <p className="mt-4 text-sm text-[var(--hb-ink)]/55">Loading orders…</p>
          ) : recent.length === 0 ? (
            <div className="mt-4 rounded-xl bg-[var(--hb-mist)]/60 px-4 py-5">
              <p className="text-sm text-[var(--hb-ink)]/70">
                No orders yet. Browse the catalogue to place your first order.
              </p>
              <Link
                to="/"
                className="mt-3 inline-block text-sm font-medium text-[var(--hb-green)]"
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[rgba(26,92,58,0.1)]">
              {recent.map((order) => {
                const shopName = order.fulfillments?.[0]?.shop?.name;
                const deliveryDate = order.fulfillments?.[0]?.deliveryDate;
                const itemCount =
                  order.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString(
                              undefined,
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              },
                            )
                          : order.id.slice(0, 8)}{' '}
                        · {formatMoney(order.totalAmount)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--hb-ink)]/55">
                        <span className="font-medium text-[var(--hb-ink)]/70">
                          {order.status.replaceAll('_', ' ')}
                        </span>
                        {' · '}
                        {order.fulfillmentMode.replaceAll('_', ' ')}
                        {itemCount > 0 ? ` · ${itemCount} items` : ''}
                        {shopName ? ` · ${shopName}` : ''}
                        {deliveryDate
                          ? ` · ${new Date(deliveryDate).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
                        disabled={reorderingId === order.id}
                        onClick={() => onReorder(order)}
                      >
                        {reorderingId === order.id ? 'Loading…' : 'Reorder'}
                      </button>
                      <Link
                        to={`/customer/orders/${order.id}`}
                        className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
                      >
                        Details
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
            <h2 className="font-semibold">Delivery address</h2>
            <Link
              to="/customer/addresses"
              className="text-sm font-medium text-[var(--hb-green)]"
            >
              Manage
            </Link>
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Default address used at checkout.
          </p>

          {!profile ? (
            <p className="mt-4 text-sm text-[var(--hb-ink)]/55">Loading…</p>
          ) : address ? (
            <div className="mt-4 rounded-xl bg-[var(--hb-mist)]/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                {address.label}
                {address.isDefault ? ' · Default' : ''}
              </p>
              <p className="mt-1 text-sm font-medium">{address.line1}</p>
              <p className="text-sm text-[var(--hb-ink)]/65">
                {address.eircode} · {address.area_name}
              </p>
              <Link
                to="/"
                className="mt-3 inline-block text-sm font-medium text-[var(--hb-green)]"
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-[var(--hb-mist)]/60 px-4 py-5">
              <p className="text-sm text-[var(--hb-ink)]/70">
                No saved delivery address yet. Add one so checkout can prefill
                your details.
              </p>
              <Link
                to="/customer/addresses"
                className="mt-3 inline-block text-sm font-medium text-[var(--hb-green)]"
              >
                Add address
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
