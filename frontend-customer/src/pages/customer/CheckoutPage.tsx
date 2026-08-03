import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  LocationSelect,
  SelectInput,
  formatUserFacingError,
  isValidEircode,
  normalizeEircode,
  toastError,
  type CustomerAddress,
} from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';
import {
  resolveDeliveryFee,
  type DeliveryFeeConfig,
} from '../../lib/delivery-fee';

type ProfileAddresses = {
  addressList?: CustomerAddress[];
};

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

/** Location-based scheduled delivery only; pickup/realtime stay in the API for later. */
const FULFILLMENT_MODE = 'scheduled_delivery' as const;

const STEPS = ['Basket', 'Delivery', 'Confirm'] as const;
const LAST_STEP = STEPS.length - 1;

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
  const { formatMoney } = useLocale();
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
  const [calendar, setCalendar] = useState<CalendarRow[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(
    null,
  );
  const [area, setArea] = useState(draft?.area ?? '');
  const [address, setAddress] = useState('');
  const [eircode, setEircode] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [addressPrefillNote, setAddressPrefillNote] = useState('');
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
  const [addressesReady, setAddressesReady] = useState(false);

  const areas = useMemo(() => {
    return Array.from(new Set(calendar.map((r) => r.areaName))).sort();
  }, [calendar]);

  const itemsSubtotal = useMemo(() => {
    return (
      draft?.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0) ?? 0
    );
  }, [draft]);

  const areaOptions = useMemo(() => {
    return areas.map((name) => {
      if (!deliveryConfig) return { value: name, label: name };
      const fee = resolveDeliveryFee({
        mode: FULFILLMENT_MODE,
        areaName: name,
        subtotal: itemsSubtotal,
        config: deliveryConfig,
      });
      return {
        value: name,
        label: name,
        meta: fee === 0 ? 'Free' : formatMoney(fee),
      };
    });
  }, [areas, deliveryConfig, itemsSubtotal, formatMoney]);

  const itemCount = useMemo(() => {
    return draft?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  }, [draft]);

  const deliveryFee = useMemo(() => {
    if (!deliveryConfig) return 0;
    return resolveDeliveryFee({
      mode: FULFILLMENT_MODE,
      areaName: area,
      subtotal: itemsSubtotal,
      config: deliveryConfig,
    });
  }, [deliveryConfig, area, itemsSubtotal]);

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

  const normalizedEircode = normalizeEircode(eircode);

  const addressByLineAndEircode = useMemo(() => {
    if (!address.trim() || !normalizedEircode) return undefined;
    return savedAddresses.find(
      (a) =>
        a.line1 === address.trim() &&
        normalizeEircode(a.eircode) === normalizedEircode,
    );
  }, [savedAddresses, address, normalizedEircode]);

  const areaMismatch =
    !!addressByLineAndEircode &&
    addressByLineAndEircode.area_name !== area;

  const selectedSavedId =
    savedAddresses.find(
      (a) =>
        a.line1 === address.trim() &&
        a.area_name === area &&
        normalizeEircode(a.eircode) === normalizedEircode,
    )?.id ?? '';

  const addressesForArea = useMemo(() => {
    if (!area) return savedAddresses;
    return savedAddresses.filter((a) => a.area_name === area);
  }, [savedAddresses, area]);

  useEffect(() => {
    api<CalendarRow[]>('/delivery-calendar')
      .then((rows) => {
        setCalendar(rows);
      })
      .catch(() => setCalendar([]));
    api<DeliveryConfig>('/platform/delivery-config')
      .then(setDeliveryConfig)
      .catch(() => setDeliveryConfig(null));
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    api<ProfileAddresses>('/auth/me', { token: session.accessToken })
      .then((p) => {
        if (cancelled) return;
        setSavedAddresses(p.addressList ?? []);
        setAddressesReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSavedAddresses([]);
          setAddressesReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  // Resolve area + address together once calendar and profile addresses are ready.
  useEffect(() => {
    if (!areas.length || !addressesReady) return;

    const draftArea =
      draft?.area && areas.includes(draft.area) ? draft.area : '';
    const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    const defArea =
      def?.area_name && areas.includes(def.area_name) ? def.area_name : '';

    setArea((prev) => {
      if (prev && areas.includes(prev)) return prev;
      return draftArea || defArea || areas[0] || '';
    });
  }, [areas, addressesReady, savedAddresses, draft?.area]);

  useEffect(() => {
    if (!addressesReady || !area) return;
    setAddress((addrPrev) => {
      if (addrPrev.trim()) return addrPrev;
      const match =
        savedAddresses.find((a) => a.area_name === area && a.isDefault) ??
        savedAddresses.find((a) => a.area_name === area);
      if (!match) {
        setAddressPrefillNote('');
        return '';
      }
      setAddressPrefillNote(
        match.isDefault
          ? 'Using your default saved address'
          : `Using saved address (${match.label})`,
      );
      setEircode((e) => (e.trim() ? e : match.eircode));
      return match.line1;
    });
  }, [addressesReady, area, savedAddresses]);

  useEffect(() => {
    const code = draft?.couponCode?.trim();
    if (!code || itemsSubtotal <= 0 || !session?.accessToken) {
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
      token: session.accessToken,
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
  }, [draft?.couponCode, itemsSubtotal, session]);

  useEffect(() => {
    if (!area) {
      setNextDelivery(null);
      setAreaError('');
      return;
    }
    if (!areas.includes(area)) {
      setNextDelivery(null);
      setAreaError('Choose a served delivery area');
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
  }, [area, areas]);

  useEffect(() => {
    if (step !== LAST_STEP || !session || !draft?.items.length || !area) {
      setPreviewOk(null);
      setUnavailableIds([]);
      setPreviewMessage('');
      setHoldId(null);
      setHoldExpiresAt(null);
      return;
    }
    if (!nextDelivery) {
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
    const body = {
      fulfillmentMode: FULFILLMENT_MODE,
      deliveryAreaName: area,
      deliveryAddress: {
        line1: address,
        eircode: normalizeEircode(eircode),
        area_name: area,
      },
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
  }, [step, session, draft, area, address, eircode, nextDelivery]);

  if (!draft?.items?.length) {
    return <Navigate to="/" replace />;
  }

  function applySavedAddress(picked: CustomerAddress) {
    setAddress(picked.line1);
    setEircode(picked.eircode);
    setArea(picked.area_name);
    setAddressPrefillNote(
      picked.isDefault
        ? 'Using your default saved address'
        : `Using saved address (${picked.label})`,
    );
  }

  function onAreaChange(nextArea: string) {
    setArea(nextArea);
    const stillValid =
      addressByLineAndEircode &&
      addressByLineAndEircode.area_name === nextArea;
    if (stillValid) {
      setAddressPrefillNote(
        addressByLineAndEircode.isDefault
          ? 'Using your default saved address'
          : `Using saved address (${addressByLineAndEircode.label})`,
      );
      return;
    }
    const match =
      savedAddresses.find(
        (a) => a.area_name === nextArea && a.isDefault,
      ) ?? savedAddresses.find((a) => a.area_name === nextArea);
    if (match) {
      applySavedAddress(match);
      return;
    }
    setAddress('');
    setEircode('');
    setAddressPrefillNote(
      'Enter an address in this delivery area, or pick a saved one',
    );
  }

  function canNext() {
    if (step === 1) {
      if (!area || !areas.includes(area) || areaError) return false;
      if (areaMismatch) return false;
      const addressOk =
        address.trim().length > 3 && isValidEircode(eircode) && !!nextDelivery;
      return addressOk;
    }
    return true;
  }

  function showCheckoutError(message: string) {
    setError(message);
    toastError(message);
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (previewOk !== true) {
      showCheckoutError(
        previewMessage || 'Some items are unavailable in this area',
      );
      return;
    }
    if (!holdId) {
      showCheckoutError(
        'Stock reservation missing — wait for availability check',
      );
      return;
    }
    if (
      holdExpiresAt &&
      new Date(holdExpiresAt).getTime() <= Date.now()
    ) {
      showCheckoutError(
        'Stock reservation expired — refresh confirm and try again',
      );
      setHoldId(null);
      setPreviewOk(null);
      return;
    }
    if (!areas.includes(area)) {
      showCheckoutError('Choose a delivery area before placing order');
      return;
    }
    if (!nextDelivery) {
      showCheckoutError(
        'Choose a delivery area from the calendar before placing order',
      );
      return;
    }
    if (areaMismatch) {
      showCheckoutError(
        'Delivery area must match the saved address area',
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = draft!.items.map(({ productId, quantity }) => ({
        productId,
        quantity,
      }));
      const body = {
        fulfillmentMode: FULFILLMENT_MODE,
        deliveryAreaName: area,
        deliveryAddress: {
          line1: address,
          eircode: normalizeEircode(eircode),
          area_name: area,
        },
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
      showCheckoutError(
        formatUserFacingError(
          err,
          'Order failed — stock may have changed. Please try again.',
        ),
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
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <div key={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full ${
                    done || current
                      ? 'bg-[var(--hb-green)]'
                      : 'bg-[var(--hb-mist)]'
                  } ${current ? 'opacity-100' : done ? 'opacity-70' : ''}`}
                />
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    current
                      ? 'text-[var(--hb-ink)]'
                      : 'text-[var(--hb-ink)]/55'
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={
            step === LAST_STEP
              ? placeOrder
              : (e) => {
                  e.preventDefault();
                  if (canNext()) setStep((s) => Math.min(LAST_STEP, s + 1));
                }
          }
          className="hb-surface mt-6 space-y-5 p-6 shadow-sm"
        >
          {step === 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">Review your basket</p>
                <Link
                  to="/"
                  className="text-sm font-medium text-[var(--hb-green)] underline-offset-2 hover:underline"
                >
                  Edit basket
                </Link>
              </div>
              <ul className="space-y-2 text-sm">
                {draft.items.map((i) => {
                  const line = (i.price ?? 0) * i.quantity;
                  return (
                    <li
                      key={i.productId}
                      className="flex items-start justify-between gap-3 rounded-lg bg-[var(--hb-mist)]/60 px-3 py-2"
                    >
                      <span>
                        {i.name ?? `${i.productId.slice(0, 8)}…`}
                        <span className="mt-0.5 block text-xs text-[var(--hb-ink)]/55">
                          {formatMoney(i.price ?? 0)} × {i.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">
                        {formatMoney(line)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="flex justify-between border-t border-[rgba(26,92,58,0.1)] pt-3 text-sm font-semibold">
                <span>Subtotal</span>
                <span>{formatMoney(itemsSubtotal)}</span>
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="font-medium">Where should we deliver?</p>
              {areas.length === 0 && (
                <p className="text-sm text-red-700">
                  No delivery areas are configured yet. Check back later.
                </p>
              )}
              <LocationSelect
                variant="field"
                label="Delivery area"
                value={area}
                options={areaOptions}
                onChange={onAreaChange}
                required
                placeholder="Select area"
              />
              {nextDelivery && (
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
                  </strong>
                </p>
              )}
              {areaError && (
                <p className="text-sm text-red-700">{areaError}</p>
              )}
              {areaMismatch && (
                <p className="text-sm text-red-700">
                  This address is saved under{' '}
                  <strong>{addressByLineAndEircode?.area_name}</strong>, not{' '}
                  <strong>{area}</strong>. Pick a matching saved address or
                  change the delivery area.
                </p>
              )}
              {savedAddresses.length > 0 && (
                <SelectInput
                  label="Saved address"
                  placeholder={
                    addressesForArea.length
                      ? 'Choose saved address…'
                      : 'No saved addresses in this area'
                  }
                  value={selectedSavedId}
                  options={addressesForArea.map((a) => ({
                    value: a.id,
                    label: `${a.label}${a.isDefault ? ' (default)' : ''} — ${a.line1}`,
                  }))}
                  onChange={(id) => {
                    const picked = savedAddresses.find((a) => a.id === id);
                    if (!picked) return;
                    applySavedAddress(picked);
                  }}
                />
              )}
              {addressPrefillNote && (
                <p className="text-xs text-[var(--hb-ink)]/55">
                  {addressPrefillNote}
                </p>
              )}
              <label className="block text-sm font-medium">
                Address
                <input
                  className="hb-input mt-1.5"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setAddressPrefillNote('');
                  }}
                  placeholder="House number and street"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Eircode
                <input
                  className="hb-input mt-1.5"
                  value={eircode}
                  onChange={(e) => {
                    setEircode(e.target.value.toUpperCase());
                    setAddressPrefillNote('');
                  }}
                  placeholder="A65 F4E2"
                  required
                />
              </label>
              <p className="text-xs text-[var(--hb-ink)]/55">
                Fees shown for your basket
                {deliveryConfig &&
                (deliveryConfig.freeDeliveryOverAmount ?? 0) > 0
                  ? ` (free over ${formatMoney(Number(deliveryConfig.freeDeliveryOverAmount))})`
                  : ''}
                . See{' '}
                <Link to="/delivery-charges" className="underline">
                  Delivery charges
                </Link>{' '}
                and the{' '}
                <Link to="/faq" className="underline">
                  FAQ
                </Link>
                .
              </p>
            </div>
          )}

          {step === LAST_STEP && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">Confirm & place order</p>
              <p>
                Delivery to <strong>{area}</strong>
              </p>
              <p>
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </p>
              <p>
                Address: {address}, {normalizeEircode(eircode)}
              </p>
              {nextDelivery && (
                <p>
                  Delivery day:{' '}
                  {new Date(nextDelivery.deliveryDate).toLocaleDateString(
                    undefined,
                    {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    },
                  )}
                </p>
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
                    ? ` · reserved until ${new Date(holdExpiresAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                    : ''}
                </p>
              )}
              <div className="mt-3 space-y-1 rounded-lg bg-[var(--hb-mist)]/70 px-3 py-3">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(itemsSubtotal)}</span>
                </p>
                {couponDiscount > 0 && appliedCoupon && (
                  <p className="flex justify-between text-[var(--hb-green)]">
                    <span>Coupon ({appliedCoupon})</span>
                    <span>−{formatMoney(couponDiscount)}</span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span>Delivery fee</span>
                  <span>
                    {deliveryFee === 0 ? 'Free' : formatMoney(deliveryFee)}
                  </span>
                </p>
                <p className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(estimatedTotal)}</span>
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
                (step === 1 && areas.length === 0) ||
                (step === LAST_STEP &&
                  (previewLoading || previewOk !== true || !holdId))
              }
              className="hb-btn hb-btn-primary flex-1 py-3"
            >
              {step === LAST_STEP
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
