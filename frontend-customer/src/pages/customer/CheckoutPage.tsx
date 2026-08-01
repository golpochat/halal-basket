import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LocationSelect } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';
import { api } from '../../lib/api';
import {
  formatEuroFee,
  resolveDeliveryFee,
  type DeliveryFeeConfig,
} from '../../lib/delivery-fee';

type CheckoutDraft = {
  items: Array<{
    productId: string;
    quantity: number;
    name?: string;
    price?: number;
  }>;
  area?: string;
  couponCode?: string | null;
};

type Features = {
  realtimeDelivery: boolean;
  multiShop: boolean;
};

type Mode = 'pickup' | 'scheduled_delivery' | 'realtime_delivery';

type CalendarRow = {
  id: string;
  areaName: string;
  deliveryDay: string;
};

type ResolveResult = {
  deliveryDate: string;
  deliveryDay: string;
};

type DeliveryConfig = DeliveryFeeConfig;

const STEPS = ['Cart', 'Fulfillment', 'Location', 'Confirm'] as const;

export function CheckoutPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['customer']}>
        <CheckoutWizard />
      </RequireRole>
    </RequireAuth>
  );
}

function CheckoutWizard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const draft = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('hb_checkout') ?? 'null',
      ) as CheckoutDraft | null;
    } catch {
      return null;
    }
  }, []);

  const [step, setStep] = useState(0);
  const [features, setFeatures] = useState<Features | null>(null);
  const [calendar, setCalendar] = useState<CalendarRow[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>('pickup');
  const [area, setArea] = useState(draft?.area ?? '');
  const [address, setAddress] = useState('');
  const [nextDelivery, setNextDelivery] = useState<ResolveResult | null>(null);
  const [areaError, setAreaError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewOk, setPreviewOk] = useState<boolean | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [previewMessage, setPreviewMessage] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);

  const areas = useMemo(() => {
    return Array.from(new Set(calendar.map((r) => r.areaName))).sort();
  }, [calendar]);

  const itemsSubtotal = useMemo(() => {
    return (
      draft?.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0) ?? 0
    );
  }, [draft]);

  const deliveryFee = useMemo(() => {
    if (!deliveryConfig) return 0;
    return resolveDeliveryFee({
      mode,
      areaName: area,
      subtotal: itemsSubtotal,
      config: deliveryConfig,
    });
  }, [deliveryConfig, mode, area, itemsSubtotal]);

  const estimatedTotal = Math.max(
    0,
    itemsSubtotal - couponDiscount + deliveryFee,
  );

  const unavailableNames = useMemo(() => {
    if (!draft || unavailableIds.length === 0) return [];
    const byId = new Map(draft.items.map((i) => [i.productId, i.name]));
    return unavailableIds.map(
      (id) => byId.get(id) ?? `${id.slice(0, 8)}…`,
    );
  }, [draft, unavailableIds]);

  useEffect(() => {
    api<Features>('/features')
      .then(setFeatures)
      .catch(() => setFeatures({ realtimeDelivery: false, multiShop: false }));
    api<CalendarRow[]>('/delivery-calendar')
      .then((rows) => {
        setCalendar(rows);
        setArea((prev) => prev || rows[0]?.areaName || '');
      })
      .catch(() => setCalendar([]));
    api<DeliveryConfig>('/platform/delivery-config')
      .then(setDeliveryConfig)
      .catch(() => setDeliveryConfig(null));
  }, []);

  useEffect(() => {
    const code = draft?.couponCode?.trim();
    if (!code || itemsSubtotal <= 0) {
      setCouponDiscount(0);
      setAppliedCoupon(null);
      return;
    }
    let cancelled = false;
    api<{
      ok: boolean;
      code?: string;
      discountAmount?: number;
      message: string;
    }>('/platform/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal: itemsSubtotal }),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.code) {
          setAppliedCoupon(res.code);
          setCouponDiscount(Number(res.discountAmount ?? 0));
        } else {
          setAppliedCoupon(null);
          setCouponDiscount(0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppliedCoupon(null);
          setCouponDiscount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft?.couponCode, itemsSubtotal]);

  useEffect(() => {
    if (!area || mode === 'pickup') {
      setNextDelivery(null);
      setAreaError('');
      return;
    }
    api<ResolveResult>(
      `/delivery-calendar/resolve?area=${encodeURIComponent(area)}`,
    )
      .then((res) => {
        setNextDelivery(res);
        setAreaError('');
      })
      .catch((e) => {
        setNextDelivery(null);
        setAreaError(e instanceof Error ? e.message : 'Area not served');
      });
  }, [area, mode]);

  useEffect(() => {
    if (step !== 3 || !session || !draft?.items.length || !area) {
      setPreviewOk(null);
      setUnavailableIds([]);
      setPreviewMessage('');
      setHoldId(null);
      setHoldExpiresAt(null);
      return;
    }
    if (mode !== 'pickup' && !nextDelivery) {
      setPreviewOk(false);
      setUnavailableIds([]);
      setPreviewMessage('Choose a valid delivery area first');
      setHoldId(null);
      setHoldExpiresAt(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setHoldId(null);
    setHoldExpiresAt(null);
    const items = draft.items.map(({ productId, quantity }) => ({
      productId,
      quantity,
    }));
    const body =
      mode === 'pickup'
        ? {
            fulfillmentMode: 'pickup' as const,
            deliveryAreaName: area,
            items,
          }
        : {
            fulfillmentMode: mode,
            deliveryAreaName: area,
            deliveryAddress: { line1: address, area_name: area },
            items,
          };

    api<{
      ok: boolean;
      message?: string;
      unavailableProductIds?: string[];
    }>('/orders/route-preview', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (cancelled) return;
        setPreviewOk(res.ok);
        setUnavailableIds(res.unavailableProductIds ?? []);
        setPreviewMessage(res.message ?? '');
        if (!res.ok) return;
        try {
          const hold = await api<{ holdId: string; expiresAt: string }>(
            '/orders/stock-hold',
            {
              method: 'POST',
              token: session.accessToken,
              body: JSON.stringify(body),
            },
          );
          if (cancelled) return;
          setHoldId(hold.holdId);
          setHoldExpiresAt(hold.expiresAt);
        } catch (e) {
          if (cancelled) return;
          setPreviewOk(false);
          setHoldId(null);
          setHoldExpiresAt(null);
          setPreviewMessage(
            e instanceof Error
              ? e.message
              : 'Could not reserve stock — try again',
          );
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setPreviewOk(false);
        setUnavailableIds([]);
        setHoldId(null);
        setHoldExpiresAt(null);
        setPreviewMessage(
          e instanceof Error ? e.message : 'Could not check availability',
        );
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, session, draft, area, mode, address, nextDelivery]);

  if (!draft?.items?.length) {
    return <Navigate to="/" replace />;
  }

  function canNext() {
    if (step === 1) {
      if (!mode) return false;
      if (mode === 'scheduled_delivery' && areas.length === 0) return false;
      return true;
    }
    if (step === 2) {
      if (!area || !areas.includes(area)) return false;
      if (mode === 'pickup') return true;
      return (
        address.trim().length > 3 && !!nextDelivery && !areaError
      );
    }
    return true;
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (previewOk !== true) {
      setError(previewMessage || 'Some items are unavailable in this area');
      return;
    }
    if (!holdId) {
      setError('Stock reservation missing — wait for availability check');
      return;
    }
    if (
      holdExpiresAt &&
      new Date(holdExpiresAt).getTime() <= Date.now()
    ) {
      setError('Stock reservation expired — refresh confirm and try again');
      setHoldId(null);
      setPreviewOk(null);
      return;
    }
    if (!areas.includes(area)) {
      setError('Choose a collection or delivery area before placing order');
      return;
    }
    if (mode !== 'pickup' && !nextDelivery) {
      setError('Choose a delivery area from the calendar before placing order');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = draft!.items.map(({ productId, quantity }) => ({
        productId,
        quantity,
      }));
      const body =
        mode === 'pickup'
          ? {
              fulfillmentMode: 'pickup',
              deliveryAreaName: area,
              items,
              couponCode: appliedCoupon || undefined,
              holdId,
            }
          : {
              fulfillmentMode: mode,
              deliveryAreaName: area,
              deliveryAddress: { line1: address, area_name: area },
              items,
              couponCode: appliedCoupon || undefined,
              holdId,
            };
      const order = await api<{ id: string }>('/orders', {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify(body),
      });
      sessionStorage.removeItem('hb_checkout');
      navigate(`/orders/${order.id}/confirmation`);
    } catch (err) {
      setHoldId(null);
      setHoldExpiresAt(null);
      setPreviewOk(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Order failed — stock may have changed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        variant="slim"
        homeTo="/"
        actions={<LocalePickers />}
      />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Checkout</h1>
      <div className="mt-4 flex gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i <= step ? 'bg-[var(--hb-green)]' : 'bg-[var(--hb-mist)]'
              }`}
            />
            <p className="mt-1.5 text-xs font-medium text-[var(--hb-ink)]/55">
              {label}
            </p>
          </div>
        ))}
      </div>

      <form
        onSubmit={
          step === 3
            ? placeOrder
            : (e) => {
                e.preventDefault();
                if (canNext()) setStep((s) => Math.min(3, s + 1));
              }
        }
        className="hb-surface mt-6 space-y-5 p-6 shadow-sm"
      >
        {step === 0 && (
          <div className="space-y-3">
            <p className="font-medium">Review your basket</p>
            <ul className="space-y-2 text-sm">
              {draft.items.map((i) => (
                <li
                  key={i.productId}
                  className="flex justify-between rounded-lg bg-[var(--hb-mist)]/60 px-3 py-2"
                >
                  <span>{i.name ?? `${i.productId.slice(0, 8)}…`}</span>
                  <span>× {i.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <fieldset className="space-y-3">
            <legend className="font-medium">How should we fulfill this?</legend>
            {(
              [
                ['pickup', 'Pickup from Halal Basket'],
                ['scheduled_delivery', 'Scheduled delivery'],
                ...(features?.realtimeDelivery
                  ? ([['realtime_delivery', 'Realtime delivery']] as const)
                  : []),
              ] as Array<[Mode, string]>
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                  mode === value
                    ? 'border-[var(--hb-green)] bg-[var(--hb-mist)]'
                    : 'border-transparent bg-white/70'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                {label}
              </label>
            ))}
            {mode !== 'pickup' && areas.length === 0 && (
              <p className="text-sm text-red-700">
                No delivery areas are configured yet. Choose pickup or check
                back later.
              </p>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <LocationSelect
              variant="field"
              label={mode === 'pickup' ? 'Collection area' : 'Delivery area'}
              value={area}
              options={areas}
              onChange={setArea}
              required
              placeholder="Select area"
            />
            {mode === 'pickup' && (
              <p className="text-sm text-[var(--hb-ink)]/65">
                We assign the nearest Halal Basket pickup point with your items
                in stock. The collection address appears after you place the
                order.
              </p>
            )}
            {mode !== 'pickup' && nextDelivery && (
              <p className="rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm">
                Next delivery:{' '}
                <strong>
                  {new Date(nextDelivery.deliveryDate).toLocaleDateString(
                    undefined,
                    {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    },
                  )}
                </strong>{' '}
                ({nextDelivery.deliveryDay})
              </p>
            )}
            {mode !== 'pickup' && areaError && (
              <p className="text-sm text-red-700">{areaError}</p>
            )}
            {mode !== 'pickup' && (
              <label className="block text-sm font-medium">
                Address
                <input
                  className="hb-input mt-1.5"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, number, Eircode"
                  required
                />
              </label>
            )}
            {mode !== 'pickup' && (
              <p className="text-xs text-[var(--hb-ink)]/55">
                Delivery fee{' '}
                {deliveryConfig ? formatEuroFee(deliveryFee) : 'shown at confirm'}
                {deliveryConfig &&
                (deliveryConfig.freeDeliveryOverAmount ?? 0) > 0 &&
                deliveryFee > 0
                  ? ` · free over €${Number(deliveryConfig.freeDeliveryOverAmount).toFixed(2)}`
                  : ''}{' '}
                · See{' '}
                <Link to="/delivery-charges" className="underline">
                  Delivery charges
                </Link>{' '}
                and the{' '}
                <Link to="/faq" className="underline">
                  FAQ
                </Link>
                .
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Confirm & place order</p>
            <p>
              Mode: <strong>{mode.replaceAll('_', ' ')}</strong>
            </p>
            <p>Items: {draft.items.length} line(s)</p>
            <p>Area: {area}</p>
            {mode !== 'pickup' && (
              <>
                <p>Address: {address}</p>
                {nextDelivery && (
                  <p>
                    Delivery day:{' '}
                    {new Date(nextDelivery.deliveryDate).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
            {mode === 'pickup' && (
              <p>Pickup from Halal Basket in {area}</p>
            )}
            {previewLoading && (
              <p className="text-sm text-[var(--hb-ink)]/55">
                Checking availability…
              </p>
            )}
            {!previewLoading && previewOk === false && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                <p className="font-medium">
                  {previewMessage ||
                    'Some items are unavailable in this area'}
                </p>
                {unavailableNames.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {unavailableNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {!previewLoading && previewOk === true && (
              <p className="text-sm text-[var(--hb-green)]">
                All items available for this area
                {holdExpiresAt
                  ? ` · stock held until ${new Date(holdExpiresAt).toLocaleTimeString()}`
                  : ''}
              </p>
            )}
            <div className="mt-3 space-y-1 rounded-lg bg-[var(--hb-mist)]/70 px-3 py-3">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span>€{itemsSubtotal.toFixed(2)}</span>
              </p>
              {couponDiscount > 0 && appliedCoupon && (
                <p className="flex justify-between text-[var(--hb-green)]">
                  <span>Coupon ({appliedCoupon})</span>
                  <span>−€{couponDiscount.toFixed(2)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>{mode === 'pickup' ? 'Pickup fee' : 'Delivery fee'}</span>
                <span>
                  {deliveryFee === 0 ? 'Free' : `€${deliveryFee.toFixed(2)}`}
                </span>
              </p>
              <p className="flex justify-between font-semibold">
                <span>Total</span>
                <span>€{estimatedTotal.toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              className="hb-btn hb-btn-ghost flex-1"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          )}
          <button
            disabled={
              loading ||
              !canNext() ||
              (step === 1 && mode !== 'pickup' && areas.length === 0) ||
              (step === 3 &&
                (previewLoading || previewOk !== true || !holdId))
            }
            className="hb-btn hb-btn-primary flex-1 py-3"
          >
            {step === 3
              ? loading
                ? 'Placing…'
                : 'Place order'
              : 'Continue'}
          </button>
        </div>
      </form>
    </main>
      <SiteFooter />
    </div>
  );
}
