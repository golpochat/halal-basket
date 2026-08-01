import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  ProductImage,
  UtilityIcons,
  CartWithCountIcon,
  ICON_SIZES,
  diffCartAgainstCatalogue,
  useCartStore,
  useCatalogueStore,
  useDeliveryCalendarQuery,
  usePlatformCatalogueQuery,
  useToastStore,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';

function formatWeekday(raw: string) {
  const d = raw.trim();
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function CartDrawer() {
  const { session } = useAuth();
  const { formatMoney } = useLocale();
  const toast = useToastStore((s) => s.toast);
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const count = useCartStore((s) =>
    s.lines.reduce((a, l) => a + l.quantity, 0),
  );
  const subtotal = useCartStore((s) =>
    s.lines.reduce((a, l) => a + l.price * l.quantity, 0),
  );
  const discount = useCartStore((s) => s.discount());
  const total = useCartStore((s) => s.total());
  const cartOpen = useCartStore((s) => s.cartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);
  const removeUnavailable = useCartStore((s) => s.removeUnavailable);
  const couponCode = useCartStore((s) => s.couponCode);
  const couponApplied = useCartStore((s) => s.couponApplied);
  const couponRule = useCartStore((s) => s.couponRule);
  const setCouponCode = useCartStore((s) => s.setCouponCode);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);
  const clearCoupon = useCartStore((s) => s.clearCoupon);

  const area = useCatalogueStore((s) => s.area);
  const calendarQuery = useDeliveryCalendarQuery(api);
  const catalogueQuery = usePlatformCatalogueQuery(
    api,
    area || undefined,
    Boolean(area) && lines.length > 0,
  );

  const unavailableIds = useMemo(() => {
    if (!catalogueQuery.data) return [] as string[];
    return diffCartAgainstCatalogue(lines, catalogueQuery.data);
  }, [lines, catalogueQuery.data]);

  const unavailableSet = useMemo(
    () => new Set(unavailableIds),
    [unavailableIds],
  );

  const prevUnavailableKey = useRef('');
  useEffect(() => {
    if (!area || lines.length === 0 || catalogueQuery.isLoading) return;
    const key = `${area}:${unavailableIds.slice().sort().join(',')}`;
    if (key === prevUnavailableKey.current) return;
    const prevHad =
      prevUnavailableKey.current.includes(':') &&
      prevUnavailableKey.current.split(':')[1] !== '';
    prevUnavailableKey.current = key;
    if (unavailableIds.length > 0) {
      toast(
        `${unavailableIds.length} item${unavailableIds.length === 1 ? '' : 's'} unavailable in ${area}`,
        'error',
      );
    } else if (prevHad) {
      toast(`Basket available in ${area}`);
    }
  }, [
    area,
    lines.length,
    unavailableIds,
    catalogueQuery.isLoading,
    toast,
  ]);

  const [confirmClear, setConfirmClear] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [promoBanner, setPromoBanner] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [cartMounted, setCartMounted] = useState(cartOpen);
  const [cartVisible, setCartVisible] = useState(cartOpen);

  useEffect(() => {
    api<{ banner: { enabled: true; message: string } | null }>(
      '/platform/promotions',
    )
      .then((res) =>
        setPromoBanner(res.banner?.enabled ? res.banner.message : null),
      )
      .catch(() => setPromoBanner(null));
  }, []);

  // Rehydrate persisted codes against live platform rules.
  useEffect(() => {
    if (!couponApplied) return;
    if (couponRule) return;
    let cancelled = false;
    api<{
      ok: boolean;
      type?: 'percent' | 'fixed';
      value?: number;
      message: string;
      code?: string;
    }>('/platform/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code: couponApplied, subtotal }),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.code && res.type != null && res.value != null) {
          setAppliedCoupon(res.code, { type: res.type, value: res.value });
        } else {
          clearCoupon();
        }
      })
      .catch(() => {
        if (!cancelled) clearCoupon();
      });
    return () => {
      cancelled = true;
    };
    // Only on mount / when applied code lacks a rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponApplied, couponRule]);

  // Keep panel mounted through exit so slide-out can finish.
  useEffect(() => {
    if (cartOpen) {
      setCartMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setCartVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setCartVisible(false);
  }, [cartOpen]);

  // Non-modal drawer: page stays scrollable/interactive so shoppers can keep adding.
  useEffect(() => {
    if (!cartOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCartOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen, setCartOpen]);

  // Fixed panels swallow wheel events. Scroll the page when the cart list
  // cannot move further in that direction (or does not overflow).
  useEffect(() => {
    if (!cartMounted || !cartVisible) return;
    const panel = panelRef.current;
    if (!panel) return;

    function onWheel(e: WheelEvent) {
      const items = itemsRef.current;
      const delta = e.deltaY;
      if (!delta) return;

      if (items) {
        const maxScroll = items.scrollHeight - items.clientHeight;
        const canScroll = maxScroll > 1;
        const atTop = items.scrollTop <= 0;
        const atBottom = items.scrollTop >= maxScroll - 1;
        const scrollingDown = delta > 0;
        const scrollingUp = delta < 0;

        if (
          canScroll &&
          ((scrollingDown && !atBottom) || (scrollingUp && !atTop))
        ) {
          return;
        }
      }

      e.preventDefault();
      window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
    }

    panel.addEventListener('wheel', onWheel, { passive: false });
    return () => panel.removeEventListener('wheel', onWheel);
  }, [cartMounted, cartVisible]);

  const deliveryHint = useMemo(() => {
    const rows = (calendarQuery.data ?? []).filter(
      (r) => r.areaName === area,
    );
    if (area && rows.length > 0) {
      const days = Array.from(
        new Set(rows.map((r) => formatWeekday(r.deliveryDay))),
      ).join(', ');
      return `Next delivery · ${area} · ${days}`;
    }
    if (area) return `Pickup from Halal Basket · ${area}`;
    return 'Select a delivery area in the header';
  }, [calendarQuery.data, area]);

  function goCheckout() {
    if (unavailableIds.length > 0) {
      toast('Remove unavailable items before checkout', 'error');
      return;
    }
    const items = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      name: l.name,
      price: l.price,
    }));
    sessionStorage.setItem(
      'hb_checkout',
      JSON.stringify({
        items,
        area,
        couponCode: couponApplied,
        discount,
      }),
    );
    setCartOpen(false);
    if (!session) {
      navigate('/login?next=/checkout');
      return;
    }
    if (session.user.role !== 'customer') {
      toast('Please sign in with a customer account to order', 'error');
      return;
    }
    navigate('/checkout');
  }

  async function onApplyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      setCouponMsg({ ok: false, text: 'Enter a code' });
      return;
    }
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        message: string;
        code?: string;
        type?: 'percent' | 'fixed';
        value?: number;
      }>('/platform/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal }),
      });
      if (!res.ok || !res.code || res.type == null || res.value == null) {
        setCouponMsg({ ok: false, text: res.message || 'Code not recognised' });
        return;
      }
      setAppliedCoupon(res.code, { type: res.type, value: res.value });
      setCouponMsg({ ok: true, text: res.message });
      setCouponOpen(false);
    } catch (err) {
      setCouponMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Could not validate code',
      });
    } finally {
      setCouponBusy(false);
    }
  }

  return (
    <>
      {/* Desktop floating basket tab — hidden while drawer is open */}
      {!cartOpen && (
        <button
          type="button"
          className="hb-cart-tab fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl bg-[var(--hb-green)] px-3 py-4 text-white shadow-[var(--hb-shadow-lg)] transition hover:bg-[var(--hb-green-hover)] sm:flex"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${count} items, ${formatMoney(total)}`}
        >
          <CartWithCountIcon count={count} size={ICON_SIZES.lg} />
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(total)}
          </span>
        </button>
      )}

      {/* Mobile floating bar */}
      {!cartOpen && (
        <button
          type="button"
          className="hb-cart-bar fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-[var(--hb-radius-lg)] bg-[var(--hb-green)] px-4 py-3 text-white shadow-[var(--hb-shadow-lg)] sm:hidden"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${count} items, ${formatMoney(total)}`}
        >
          {UtilityIcons.cart({ size: 20 })}
          <span className="font-medium">{count} items</span>
          <span className="font-medium tabular-nums">{formatMoney(total)}</span>
          <span className="font-semibold">View</span>
        </button>
      )}

      {cartMounted && (
        <aside
          ref={panelRef}
          className={`hb-panel-cart fixed bottom-0 right-0 top-16 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-[rgba(26,92,58,0.1)] bg-white sm:top-20 ${
            cartVisible ? 'is-open' : ''
          }`}
          role="dialog"
          aria-modal="false"
          aria-labelledby="cart-drawer-title"
          aria-hidden={!cartVisible}
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (!cartOpen) setCartMounted(false);
          }}
        >
            {/* Promo banner */}
            {count > 0 && promoBanner && (
              <p className="bg-[var(--hb-green)] px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
                {promoBanner}
              </p>
            )}

            {/* Sticky header summary */}
            <div className="sticky top-0 z-10 border-b border-[rgba(26,92,58,0.1)] bg-white px-4 py-3 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--hb-green)]" aria-hidden>
                  <CartWithCountIcon count={count} size={ICON_SIZES.md} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="cart-drawer-title"
                    className="font-display text-lg font-semibold italic tracking-tight sm:text-xl"
                  >
                    {count} {count === 1 ? 'item' : 'items'}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--hb-green)]">
                    <span className="truncate">{deliveryHint}</span>
                    <span className="sr-only">Fulfillment details</span>
                    {UtilityIcons.help({
                      size: 14,
                      className: 'shrink-0 opacity-70',
                      title: deliveryHint,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--hb-radius)] text-[var(--hb-green)] hover:bg-[var(--hb-mist)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)]"
                  aria-label="Collapse cart"
                  title="Collapse cart"
                  onClick={() => setCartOpen(false)}
                >
                  <span className="text-xl font-medium leading-none" aria-hidden>
                    »
                  </span>
                </button>
              </div>
              {lines.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                  {unavailableIds.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--hb-error)] hover:underline"
                      onClick={() => {
                        removeUnavailable(unavailableIds);
                        toast('Unavailable items removed');
                      }}
                    >
                      Remove unavailable
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--hb-ink)]/50 hover:text-[var(--hb-error)]"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear cart
                  </button>
                </div>
              )}
            </div>

            {/* Line items */}
            <div
              ref={itemsRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5"
            >
              {lines.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--hb-ink)]/55">
                  Your basket is empty. Add something delicious.
                </p>
              )}
              {unavailableIds.length > 0 && area && (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                  Some items are unavailable in {area}. Remove them to checkout.
                </p>
              )}
              <ul className="hb-panel-stagger divide-y divide-[rgba(26,92,58,0.08)]">
                {lines.map((l) => {
                  const lineTotal = l.price * l.quantity;
                  const unavailable = unavailableSet.has(l.productId);
                  return (
                    <li
                      key={l.productId}
                      className={`flex gap-3 py-4 ${
                        unavailable ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.1)] bg-[var(--hb-mist)] sm:h-[4.5rem] sm:w-[4.5rem]">
                        <ProductImage
                          src={l.imageUrl}
                          alt={l.name}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--hb-ink)]">
                          {l.name}
                        </p>
                        {unavailable ? (
                          <p className="mt-0.5 text-xs font-medium text-red-700">
                            Unavailable in {area || 'this area'}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-[var(--hb-ink)]/50">
                            {formatMoney(l.price)} each
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div
                            className="inline-flex h-8 items-center overflow-hidden rounded-full border border-[rgba(26,92,58,0.14)] bg-[var(--hb-neutral-100)]"
                            role="group"
                            aria-label={`Quantity for ${l.name}`}
                          >
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center text-base font-medium text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]"
                              aria-label={`Decrease ${l.name}`}
                              onClick={() => setQty(l.productId, l.quantity - 1)}
                            >
                              −
                            </button>
                            <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
                              {l.quantity}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center text-base font-medium text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]"
                              aria-label={`Increase ${l.name}`}
                              onClick={() => setQty(l.productId, l.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-[var(--hb-ink)]">
                            {formatMoney(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Coupon + checkout footer */}
            <div className="border-t border-[rgba(26,92,58,0.1)] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
              {!couponOpen ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left text-sm font-medium text-[var(--hb-ink)]/70 hover:text-[var(--hb-green)] disabled:opacity-45"
                    onClick={() => setCouponOpen(true)}
                    disabled={count === 0}
                  >
                    {UtilityIcons.chevronDown({ size: 16 })}
                    {couponApplied
                      ? `Code ${couponApplied}${discount > 0 ? ` (−${formatMoney(discount)})` : ''}`
                      : 'Coupon code'}
                  </button>
                  {couponApplied && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--hb-ink)]/45 underline hover:text-[var(--hb-error)]"
                      onClick={() => {
                        clearCoupon();
                        setCouponMsg(null);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <div className="mb-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="cart-coupon">
                      Coupon code
                    </label>
                    <input
                      id="cart-coupon"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponMsg(null);
                      }}
                      placeholder="Coupon code"
                      className="hb-input min-w-0 flex-1"
                      autoComplete="off"
                      disabled={couponBusy}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void onApplyCoupon();
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-10 px-3"
                      onClick={() => void onApplyCoupon()}
                      disabled={couponBusy}
                    >
                      {couponBusy ? '…' : 'Go'}
                    </Button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--hb-ink)]/55 hover:text-[var(--hb-ink)]"
                      onClick={() => {
                        setCouponOpen(false);
                        setCouponMsg(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                  {couponMsg && (
                    <p
                      className={`text-xs ${
                        couponMsg.ok
                          ? 'text-[var(--hb-green)]'
                          : 'text-[var(--hb-error)]'
                      }`}
                      role="status"
                    >
                      {couponMsg.text}
                    </p>
                  )}
                </div>
              )}

              {discount > 0 && (
                <div className="mb-2 flex justify-between text-sm text-[var(--hb-ink)]/60">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
              )}

              <button
                type="button"
                disabled={count === 0 || unavailableIds.length > 0}
                onClick={goCheckout}
                className="flex h-12 w-full items-center justify-between gap-3 rounded-[var(--hb-radius)] bg-[var(--hb-green)] px-4 text-white transition hover:bg-[var(--hb-green-hover)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="text-base font-semibold">Checkout</span>
                <span className="rounded-md bg-[rgba(0,0,0,0.22)] px-3 py-1.5 text-sm font-semibold tabular-nums">
                  {formatMoney(total)}
                </span>
              </button>
            </div>
          </aside>
      )}

      <Modal
        open={confirmClear}
        title="Clear cart?"
        onClose={() => setConfirmClear(false)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="tertiary"
              className="flex-1"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                clear();
                setConfirmClear(false);
                toast('Cart cleared');
              }}
            >
              Clear cart
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--hb-ink)]/70">
          This removes all items from your basket.
        </p>
      </Modal>
    </>
  );
}
