import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { api } from '../../lib/api';

type CheckoutDraft = {
  shopId: string;
  items: Array<{ productId: string; quantity: number }>;
};

type Features = {
  realtimeDelivery: boolean;
  multiShop: boolean;
};

type Mode = 'pickup' | 'scheduled_delivery' | 'realtime_delivery';

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
  const [mode, setMode] = useState<Mode>('pickup');
  const [area, setArea] = useState('Lucan');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Features>('/features')
      .then(setFeatures)
      .catch(() => setFeatures({ realtimeDelivery: false, multiShop: false }));
  }, []);

  if (!draft?.items?.length) {
    return <Navigate to="/customer" replace />;
  }

  function canNext() {
    if (step === 1) return !!mode;
    if (step === 2 && mode !== 'pickup') return address.trim().length > 3;
    return true;
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const body =
        mode === 'pickup'
          ? {
              fulfillmentMode: 'pickup',
              preferredShopId: draft!.shopId,
              items: draft!.items,
            }
          : {
              fulfillmentMode: mode,
              deliveryAreaName: area,
              preferredShopId: draft!.shopId,
              deliveryAddress: { line1: address, area_name: area },
              items: draft!.items,
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
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <Link to="/customer" className="inline-block">
        <BrandLogo size="sm" />
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold">Checkout</h1>
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
                  <span className="font-mono text-xs">
                    {i.productId.slice(0, 8)}…
                  </span>
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
              >
                <option>Lucan</option>
                <option>Swords</option>
                <option>Tallaght</option>
              </select>
            </label>
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
            disabled={loading || !canNext()}
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
  );
}
