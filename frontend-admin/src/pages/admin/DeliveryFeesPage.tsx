import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { DeliveryFees, CalendarAdminRow } from './types';

export function AdminDeliveryFeesPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <DeliveryFeesInner />
      </RequireRole>
    </RequireAuth>
  );
}

function DeliveryFeesInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFees>({
    scheduledDeliveryFee: 3.99,
    pickupFee: 0,
    freeDeliveryOverAmount: 0,
    feesByArea: {},
  });
  const [calendarRows, setCalendarRows] = useState<CalendarAdminRow[]>([]);

  useEffect(() => {
    Promise.all([
      api<DeliveryFees>('/admin/platform/delivery-fees', { token }),
      api<CalendarAdminRow[]>('/admin/delivery-calendar', { token }),
    ])
      .then(([fees, cal]) => {
        setDeliveryFees({
          scheduledDeliveryFee: fees.scheduledDeliveryFee,
          pickupFee: fees.pickupFee,
          freeDeliveryOverAmount: fees.freeDeliveryOverAmount ?? 0,
          feesByArea: fees.feesByArea ?? {},
        });
        setCalendarRows(cal);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Delivery fees</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-semibold">Delivery fees</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Dynamic Halal Basket fees (EUR). Default applies when an area has no
            override. Free-over uses items subtotal; set to 0 to disable.
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setMsg('');
              try {
                const areaNames = Array.from(
                  new Set(calendarRows.map((r) => r.areaName)),
                );
                const feesByArea: Record<string, number> = {};
                for (const name of areaNames) {
                  const override = deliveryFees.feesByArea[name];
                  if (
                    override != null &&
                    Number.isFinite(override) &&
                    override !== Number(deliveryFees.scheduledDeliveryFee)
                  ) {
                    feesByArea[name] = Number(override);
                  }
                }
                const saved = await api<DeliveryFees>(
                  '/admin/platform/delivery-fees',
                  {
                    method: 'PUT',
                    token,
                    body: JSON.stringify({
                      scheduledDeliveryFee: Number(deliveryFees.scheduledDeliveryFee),
                      pickupFee: Number(deliveryFees.pickupFee),
                      freeDeliveryOverAmount: Number(deliveryFees.freeDeliveryOverAmount),
                      feesByArea,
                    }),
                  },
                );
                setDeliveryFees({
                  scheduledDeliveryFee: saved.scheduledDeliveryFee,
                  pickupFee: saved.pickupFee,
                  freeDeliveryOverAmount: saved.freeDeliveryOverAmount ?? 0,
                  feesByArea: saved.feesByArea ?? {},
                });
                setMsg('Delivery fees saved');
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Failed to save fees',
                );
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                Default scheduled (€)
                <input
                  className="hb-input mt-1.5"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryFees.scheduledDeliveryFee}
                  onChange={(e) =>
                    setDeliveryFees((f) => ({
                      ...f,
                      scheduledDeliveryFee: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                Pickup (€)
                <input
                  className="hb-input mt-1.5"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryFees.pickupFee}
                  onChange={(e) =>
                    setDeliveryFees((f) => ({
                      ...f,
                      pickupFee: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                Free delivery over (€)
                <input
                  className="hb-input mt-1.5"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryFees.freeDeliveryOverAmount}
                  onChange={(e) =>
                    setDeliveryFees((f) => ({
                      ...f,
                      freeDeliveryOverAmount: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>

            {Array.from(new Set(calendarRows.map((r) => r.areaName))).sort()
              .length > 0 && (
              <div>
                <p className="text-sm font-medium">Per-area scheduled fees</p>
                <p className="mt-0.5 text-xs text-[var(--hb-ink)]/50">
                  Leave equal to default to use the platform default. Saved
                  overrides only when different.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from(new Set(calendarRows.map((r) => r.areaName)))
                    .sort()
                    .map((areaName) => {
                      const value =
                        deliveryFees.feesByArea[areaName] ??
                        deliveryFees.scheduledDeliveryFee;
                      return (
                        <label key={areaName} className="text-sm">
                          {areaName} (€)
                          <input
                            className="hb-input mt-1.5"
                            type="number"
                            min={0}
                            step="0.01"
                            value={value}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              setDeliveryFees((f) => ({
                                ...f,
                                feesByArea: {
                                  ...f.feesByArea,
                                  [areaName]: n,
                                },
                              }));
                            }}
                          />
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="hb-btn hb-btn-primary px-4 py-2 text-sm"
              >
                Save fees
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
