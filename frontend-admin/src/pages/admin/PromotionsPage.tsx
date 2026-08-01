import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type Coupon = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
};

type PromotionsResponse = {
  bannerEnabled: boolean;
  bannerMessage: string;
  coupons: Coupon[];
};

export function AdminPromotionsPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <PromotionsInner />
      </RequireRole>
    </RequireAuth>
  );
}

function PromotionsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [promoBannerEnabled, setPromoBannerEnabled] = useState(true);
  const [promoBannerMessage, setPromoBannerMessage] = useState(
    'You have reduced delivery charge',
  );
  const [promoCoupons, setPromoCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    api<PromotionsResponse>('/admin/platform/promotions', { token })
      .then((promo) => {
        setPromoBannerEnabled(promo.bannerEnabled);
        setPromoBannerMessage(promo.bannerMessage);
        setPromoCoupons(promo.coupons);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Promotions</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-semibold">Cart promo &amp; coupons</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Banner text shown in the cart when enabled. Coupons are validated
            server-side at apply and at checkout.
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setMsg('');
              try {
                const saved = await api<PromotionsResponse>(
                  '/admin/platform/promotions',
                  {
                    method: 'PUT',
                    token,
                    body: JSON.stringify({
                      bannerEnabled: promoBannerEnabled,
                      bannerMessage: promoBannerMessage,
                      coupons: promoCoupons
                        .filter((c) => c.code.trim())
                        .map((c) => ({
                          code: c.code.trim().toUpperCase(),
                          type: c.type,
                          value: Number(c.value),
                          active: c.active,
                        })),
                    }),
                  },
                );
                setPromoBannerEnabled(saved.bannerEnabled);
                setPromoBannerMessage(saved.bannerMessage);
                setPromoCoupons(saved.coupons);
                setMsg('Promotions saved');
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Failed to save promotions',
                );
              }
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promoBannerEnabled}
                onChange={(e) => setPromoBannerEnabled(e.target.checked)}
              />
              Show cart promo banner
            </label>
            <label className="block text-sm">
              Banner message
              <input
                className="hb-input mt-1.5"
                value={promoBannerMessage}
                onChange={(e) => setPromoBannerMessage(e.target.value)}
                maxLength={160}
                disabled={!promoBannerEnabled}
              />
            </label>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Coupons</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--hb-green)]"
                  onClick={() =>
                    setPromoCoupons((rows) => [
                      ...rows,
                      { code: '', type: 'percent', value: 10, active: true },
                    ])
                  }
                >
                  Add coupon
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {promoCoupons.map((row, idx) => (
                  <li
                    key={`${row.code}-${idx}`}
                    className="grid gap-2 rounded-lg bg-white/70 p-3 sm:grid-cols-[1fr_7rem_6rem_auto_auto]"
                  >
                    <input
                      className="hb-input"
                      placeholder="CODE"
                      value={row.code}
                      onChange={(e) =>
                        setPromoCoupons((rows) =>
                          rows.map((r, i) =>
                            i === idx
                              ? { ...r, code: e.target.value.toUpperCase() }
                              : r,
                          ),
                        )
                      }
                    />
                    <select
                      className="hb-input"
                      value={row.type}
                      onChange={(e) =>
                        setPromoCoupons((rows) =>
                          rows.map((r, i) =>
                            i === idx
                              ? { ...r, type: e.target.value as 'percent' | 'fixed' }
                              : r,
                          ),
                        )
                      }
                    >
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed €</option>
                    </select>
                    <input
                      className="hb-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.value}
                      onChange={(e) =>
                        setPromoCoupons((rows) =>
                          rows.map((r, i) =>
                            i === idx
                              ? { ...r, value: Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                    />
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(e) =>
                          setPromoCoupons((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, active: e.target.checked } : r,
                            ),
                          )
                        }
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--hb-error)]"
                      onClick={() =>
                        setPromoCoupons((rows) => rows.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {promoCoupons.length === 0 && (
                  <li className="text-sm text-[var(--hb-ink)]/50">
                    No coupons configured.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="hb-btn hb-btn-primary px-4 py-2 text-sm"
              >
                Save promotions
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
