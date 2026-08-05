import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  IconButton,
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
  localizeCouponMessage,
  localizePromoBanner,
  localizeProductName,
  formatUiNumber,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';
import {
  resolveDeliveryFee,
  type DeliveryFeeConfig,
} from '../../lib/delivery-fee';

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function translateDay(
  raw: string,
  t: (key: string) => string,
): string {
  const d = raw.trim().toLowerCase();
  if (!d) return '';
  if ((DAY_KEYS as readonly string[]).includes(d)) {
    return t(`day.${d}`);
  }
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function CartDrawer() {
  const { session } = useAuth();
  const { t, formatMoney, formatNumber, languageCode } = useLocale();
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
  const itemsTotal = useCartStore((s) => s.total());
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
        t('cart.toastUnavailable', {
          count: unavailableIds.length,
          area,
        }),
        'error',
      );
    } else if (prevHad) {
      toast(t('cart.toastAvailable', { area }));
    }
  }, [
    area,
    lines.length,
    unavailableIds,
    catalogueQuery.isLoading,
    toast,
    t,
  ]);

  const [confirmClear, setConfirmClear] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [promoBanner, setPromoBanner] = useState<string | null>(null);
  const [deliveryConfig, setDeliveryConfig] =
    useState<DeliveryFeeConfig | null>(null);
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

  useEffect(() => {
    api<DeliveryFeeConfig>('/platform/delivery-config')
      .then(setDeliveryConfig)
      .catch(() => setDeliveryConfig(null));
  }, []);

  const deliveryFee = useMemo(() => {
    if (!deliveryConfig || !area || subtotal <= 0) return 0;
    return resolveDeliveryFee({
      mode: 'scheduled_delivery',
      areaName: area,
      subtotal,
      config: deliveryConfig,
    });
  }, [deliveryConfig, area, subtotal]);

  const grandTotal = Math.max(0, itemsTotal + deliveryFee);

  const displayPromo = useMemo(() => {
    if (!promoBanner) return null;
    return localizePromoBanner(t, promoBanner, formatMoney);
  }, [promoBanner, t, formatMoney]);

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
      token: session?.accessToken,
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
        new Set(rows.map((r) => translateDay(r.deliveryDay, t))),
      ).join(', ');
      return t('cart.nextDelivery', { area, days });
    }
    if (area) return t('cart.pickupHint', { area });
    return t('cart.selectAreaHint');
  }, [calendarQuery.data, area, t, languageCode]);

  function goCheckout() {
    if (unavailableIds.length > 0) {
      toast(t('cart.toastRemoveBeforeCheckout'), 'error');
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
      toast(t('cart.toastCustomerAccount'), 'error');
      return;
    }
    navigate('/checkout');
  }

  async function onApplyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      setCouponMsg({ ok: false, text: t('cart.enterCode') });
      return;
    }
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        message: string;
        reason?: string;
        code?: string;
        type?: 'percent' | 'fixed';
        value?: number;
      }>('/platform/coupons/validate', {
        method: 'POST',
        token: session?.accessToken,
        body: JSON.stringify({ code, subtotal }),
      });
      if (!res.ok || !res.code || res.type == null || res.value == null) {
        setCouponMsg({
          ok: false,
          text: localizeCouponMessage(t, {
            reason: res.reason,
            message: res.message,
            code: res.code,
          }),
        });
        return;
      }
      setAppliedCoupon(res.code, { type: res.type, value: res.value });
      setCouponMsg({
        ok: true,
        text: localizeCouponMessage(t, {
          reason: res.reason ?? 'applied',
          message: res.message,
          code: res.code,
        }),
      });
      setCouponOpen(false);
    } catch (err) {
      setCouponMsg({
        ok: false,
        text: err instanceof Error ? err.message : t('cart.validateFailed'),
      });
    } finally {
      setCouponBusy(false);
    }
  }

  const openCartAria = t('cart.openAria', {
    count,
    total: formatMoney(grandTotal),
  });
  const cartBadgeLabel =
    count > 99
      ? `${formatUiNumber(99, languageCode)}+`
      : formatNumber(Math.max(0, count));

  return (
    <>
      {/* Desktop floating basket tab — hidden while drawer is open */}
      {!cartOpen && (
        <button
          type="button"
          className="hb-cart-tab fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 cursor-pointer flex-col items-center gap-2 rounded-l-2xl bg-[var(--hb-green)] px-3 py-4 text-white shadow-[var(--hb-shadow-lg)] transition hover:bg-[var(--hb-green-hover)] sm:flex"
          onClick={() => setCartOpen(true)}
          aria-label={openCartAria}
        >
          <CartWithCountIcon
            count={count}
            countLabel={cartBadgeLabel}
            size={ICON_SIZES.lg}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
            {t('cart.tabLabel')}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(grandTotal)}
          </span>
        </button>
      )}

      {/* Mobile floating bar */}
      {!cartOpen && (
        <button
          type="button"
          className="hb-cart-bar fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 cursor-pointer items-center gap-3 rounded-[var(--hb-radius-lg)] bg-[var(--hb-green)] px-4 py-3 text-white shadow-[var(--hb-shadow-lg)] sm:hidden"
          onClick={() => setCartOpen(true)}
          aria-label={openCartAria}
        >
          {UtilityIcons.cart({ size: 20 })}
          <span className="font-medium">
            {t(
              count === 1 ? 'cart.itemCount_one' : 'cart.itemCount_other',
              { count },
            )}
          </span>
          <span className="font-medium tabular-nums">
            {formatMoney(grandTotal)}
          </span>
          <span className="font-semibold">{t('cart.view')}</span>
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
            {/* Promo banner — message from API */}
            {count > 0 && displayPromo && (
              <p className="bg-[var(--hb-green)] px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
                {displayPromo}
              </p>
            )}

            {/* Sticky header summary */}
            <div className="sticky top-0 z-10 border-b border-[rgba(26,92,58,0.1)] bg-white px-4 py-3 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--hb-green)]" aria-hidden>
                  <CartWithCountIcon
                    count={count}
                    countLabel={cartBadgeLabel}
                    size={ICON_SIZES.md}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="cart-drawer-title"
                    className="font-display text-lg font-semibold italic tracking-tight sm:text-xl"
                  >
                    {t(
                      count === 1
                        ? 'cart.itemCount_one'
                        : 'cart.itemCount_other',
                      { count },
                    )}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--hb-green)]">
                    <span className="truncate">{deliveryHint}</span>
                    <span className="sr-only">
                      {t('cart.fulfillmentDetails')}
                    </span>
                    {UtilityIcons.help({
                      size: 14,
                      className: 'shrink-0 opacity-70',
                      title: deliveryHint,
                    })}
                  </p>
                </div>
                <IconButton
                  label={t('cart.collapse')}
                  onClick={() => setCartOpen(false)}
                >
                  <span className="text-xl font-medium leading-none" aria-hidden>
                    »
                  </span>
                </IconButton>
              </div>
              {lines.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                  {unavailableIds.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--hb-error)] hover:underline"
                      onClick={() => {
                        removeUnavailable(unavailableIds);
                        toast(t('cart.removeUnavailableSuccess'));
                      }}
                    >
                      {t('cart.removeUnavailable')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--hb-ink)]/50 hover:text-[var(--hb-error)]"
                    onClick={() => setConfirmClear(true)}
                  >
                    {t('cart.clear')}
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
                  {t('cart.empty')}
                </p>
              )}
              {unavailableIds.length > 0 && area && (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                  {t('cart.unavailableBanner', { area })}
                </p>
              )}
              <ul className="hb-panel-stagger divide-y divide-[rgba(26,92,58,0.08)]">
                {lines.map((l) => {
                  const lineTotal = l.price * l.quantity;
                  const unavailable = unavailableSet.has(l.productId);
                  const displayName = localizeProductName(
                    l.name,
                    languageCode,
                  );
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
                          alt={displayName}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--hb-ink)]">
                          {displayName}
                        </p>
                        {unavailable ? (
                          <p className="mt-0.5 text-xs font-medium text-red-700">
                            {t('cart.unavailableLine', {
                              area: area || t('cart.thisArea'),
                            })}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-[var(--hb-ink)]/50">
                            {t('cart.priceEach', {
                              price: formatMoney(l.price),
                            })}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div
                            className="inline-flex h-8 items-center overflow-hidden rounded-full border border-[rgba(26,92,58,0.14)] bg-[var(--hb-neutral-100)]"
                            role="group"
                            aria-label={t('cart.qtyAria', {
                              name: displayName,
                            })}
                          >
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center text-base font-medium text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]"
                              aria-label={t('cart.decreaseAria', {
                                name: displayName,
                              })}
                              onClick={() =>
                                setQty(l.productId, l.quantity - 1)
                              }
                            >
                              −
                            </button>
                            <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
                              {formatNumber(l.quantity)}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center text-base font-medium text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]"
                              aria-label={t('cart.increaseAria', {
                                name: displayName,
                              })}
                              onClick={() =>
                                setQty(l.productId, l.quantity + 1)
                              }
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
                    className="flex cursor-pointer items-center gap-2 text-left text-sm font-medium text-[var(--hb-ink)]/70 hover:text-[var(--hb-green)] disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={() => setCouponOpen(true)}
                    disabled={count === 0}
                  >
                    {UtilityIcons.chevronDown({ size: 16 })}
                    {couponApplied
                      ? discount > 0
                        ? t('cart.couponAppliedDiscount', {
                            code: couponApplied,
                            discount: formatMoney(discount),
                          })
                        : t('cart.couponApplied', { code: couponApplied })
                      : t('cart.coupon')}
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
                      {t('cart.removeCoupon')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mb-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="cart-coupon">
                      {t('cart.coupon')}
                    </label>
                    <input
                      id="cart-coupon"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponMsg(null);
                      }}
                      placeholder={t('cart.coupon')}
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
                      {couponBusy ? '…' : t('cart.couponGo')}
                    </Button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--hb-ink)]/55 hover:text-[var(--hb-ink)]"
                      onClick={() => {
                        setCouponOpen(false);
                        setCouponMsg(null);
                      }}
                    >
                      {t('cart.couponClose')}
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

              {count > 0 && (
                <div className="mb-3 space-y-1 text-sm text-[var(--hb-ink)]/70">
                  <div className="flex justify-between">
                    <span>{t('cart.subtotal')}</span>
                    <span className="tabular-nums">
                      {formatMoney(subtotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--hb-green)]">
                      <span>{t('cart.discount')}</span>
                      <span className="tabular-nums">
                        −{formatMoney(discount)}
                      </span>
                    </div>
                  )}
                  {area && deliveryConfig && (
                    <div className="flex justify-between">
                      <span>{t('cart.deliveryFee')}</span>
                      <span className="tabular-nums">
                        {deliveryFee === 0
                          ? t('checkout.free')
                          : formatMoney(deliveryFee)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-[var(--hb-ink)]">
                    <span>{t('cart.total')}</span>
                    <span className="tabular-nums">
                      {formatMoney(grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={count === 0 || unavailableIds.length > 0}
                onClick={goCheckout}
                className="flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--hb-radius)] bg-[var(--hb-green)] px-4 text-white transition hover:bg-[var(--hb-green-hover)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="text-base font-semibold">
                  {t('cart.checkout')}
                </span>
                <span className="rounded-md bg-[rgba(0,0,0,0.22)] px-3 py-1.5 text-sm font-semibold tabular-nums">
                  {formatMoney(grandTotal)}
                </span>
              </button>
            </div>
          </aside>
      )}

      <Modal
        open={confirmClear}
        title={t('cart.clearConfirmTitle')}
        onClose={() => setConfirmClear(false)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="tertiary"
              className="flex-1"
              onClick={() => setConfirmClear(false)}
            >
              {t('cart.cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                clear();
                setConfirmClear(false);
                toast(t('cart.clearSuccess'));
              }}
            >
              {t('cart.clear')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--hb-ink)]/70">
          {t('cart.clearConfirmBody')}
        </p>
      </Modal>
    </>
  );
}
