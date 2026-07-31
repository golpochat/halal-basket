import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';
import { api } from '../../lib/api';

type CheckoutDraft = {
  shopId: string;
  items: Array<{ productId: string; quantity: number; name?: string }>;
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

const STEPS = ['Cart', 'Fulfillment', 'Address', 'Confirm'] as const;

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
  const [mode, setMode] = useState<Mode>('pickup');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [nextDelivery, setNextDelivery] = useState<ResolveResult | null>(null);
  const [areaError, setAreaError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const areas = useMemo(() => {
    return Array.from(new Set(calendar.map((r) => r.areaName))).sort();
  }, [calendar]);

  useEffect(() => {
    api<Features>('/features')
      .then(setFeatures)
      .catch(() => setFeatures({ realtimeDelivery: false, multiShop: false }));
    api<CalendarRow[]>('/delivery-calendar')
      .then((rows) => {
        setCalendar(rows);
        if (rows[0] && !area) setArea(rows[0].areaName);
      })
      .catch(() => setCalendar([]));
  }, []);

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

  if (!draft?.items?.length) {
    return <Navigate to="/customer" replace />;
  }

  function canNext() {
    if (step === 1) return !!mode;
    if (step === 2 && mode !== 'pickup') {
      return (
        address.trim().length > 3 &&
        !!area &&
        areas.includes(area) &&
        !!nextDelivery &&
        !areaError
      );
    }
    return true;
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (mode !== 'pickup' && (!areas.includes(area) || !nextDelivery)) {
      setError('Choose a delivery area from the calendar before placing order');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body =
        mode === 'pickup'
          ? {
              fulfillmentMode: 'pickup',
              preferredShopId: draft!.shopId,
              items: draft!.items.map(({ productId, quantity }) => ({
                productId,
                quantity,
              })),
            }
          : {
              fulfillmentMode: mode,
              deliveryAreaName: area,
              preferredShopId: draft!.shopId,
              deliveryAddress: { line1: address, area_name: area },
              items: draft!.items.map(({ productId, quantity }) => ({
                productId,
                quantity,
              })),
            };
      const order = await api<{ id: string }>('/orders', {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify(body),
      });
      sessionStorage.removeItem('hb_checkout');
      navigate(`/customer/orders/${order.id}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        variant="slim"
        homeTo="/customer"
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
                if (canNext()) {
                  if (step === 1 && mode === 'pickup') setStep(3);
                  else setStep((s) => Math.min(3, s + 1));
                }
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
            {features?.multiShop && (
              <p className="text-xs text-[var(--hb-ink)]/55">
                Multi-shop split is enabled if one shop cannot fulfill all
                items.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <fieldset className="space-y-3">
            <legend className="font-medium">How should we fulfill this?</legend>
            {(
              [
                ['pickup', 'Pickup at shop'],
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
            {mode === 'scheduled_delivery' && areas.length === 0 && (
              <p className="text-sm text-red-700">
                No delivery areas are configured yet. Choose pickup or check
                back later.
              </p>
            )}
          </fieldset>
        )}

        {step === 2 && mode !== 'pickup' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Delivery area
              <select
                className="hb-input mt-1.5"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              >
                {areas.length === 0 && (
                  <option value="">No areas available</option>
                )}
                {areas.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
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
                </strong>{' '}
                ({nextDelivery.deliveryDay})
              </p>
            )}
            {areaError && (
              <p className="text-sm text-red-700">{areaError}</p>
            )}
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
            <p className="text-xs text-[var(--hb-ink)]/55">
              Pilot delivery fee €3.99 · See{' '}
              <Link to="/help" className="underline">
                Help
              </Link>{' '}
              for refunds and pickup.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Confirm & place order</p>
            <p>
              Mode: <strong>{mode.replaceAll('_', ' ')}</strong>
            </p>
            <p>Items: {draft.items.length} line(s)</p>
            {mode !== 'pickup' && (
              <>
                <p>Area: {area}</p>
                <p>Address: {address}</p>
                {nextDelivery && (
                  <p>
                    Delivery day:{' '}
                    {new Date(nextDelivery.deliveryDate).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
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
              onClick={() => {
                if (step === 3 && mode === 'pickup') setStep(1);
                else setStep((s) => s - 1);
              }}
            >
              Back
            </button>
          )}
          <button
            disabled={
              loading ||
              !canNext() ||
              (step === 1 &&
                mode === 'scheduled_delivery' &&
                areas.length === 0)
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
