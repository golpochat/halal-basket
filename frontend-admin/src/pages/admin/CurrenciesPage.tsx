import { FormEvent, useEffect, useState } from 'react';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { CurrencyRow } from './types';

export function AdminCurrenciesPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['currencies.read']}>
        <CurrenciesInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function CurrenciesInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('currencies.write');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [curCode, setCurCode] = useState('');
  const [curSymbol, setCurSymbol] = useState('');
  const [curName, setCurName] = useState('');
  const [curRate, setCurRate] = useState('1');

  async function refresh() {
    setCurrencies(await api<CurrencyRow[]>('/admin/currencies', { token }));
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  async function addCurrency(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/admin/currencies', {
        method: 'POST',
        token,
        body: JSON.stringify({
          code: curCode,
          symbol: curSymbol,
          name: curName,
          exchangeRate: Number(curRate) || 1,
          isPublished: false,
        }),
      });
      setCurCode('');
      setCurSymbol('');
      setCurName('');
      setCurRate('1');
      setMsg('Currency added (unpublished)');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Currency create failed');
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Currencies</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-8 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Currencies</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Default is always published. Customer currency picker appears only when
            2+ currencies are published. Prices are stored in the default currency;
            exchange rate is for display.
          </p>
          <ul className="mt-4 space-y-2">
            {currencies.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm"
              >
                <span>
                  <strong>
                    {c.symbol} {c.code}
                  </strong>{' '}
                  — {c.name} · rate {Number(c.exchangeRate)}
                  {c.isDefault ? ' · default' : ''}
                  {c.isPublished ? ' · published' : ' · unpublished'}
                </span>
                {canWrite ? (
                  <span className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="hb-btn hb-btn-ghost px-2 py-1 text-xs"
                    disabled={c.isDefault && c.isPublished}
                    onClick={async () => {
                      setError('');
                      try {
                        await api(`/admin/currencies/${c.id}/publish`, {
                          method: 'PATCH',
                          token,
                          body: JSON.stringify({ isPublished: !c.isPublished }),
                        });
                        setMsg(
                          c.isPublished
                            ? `${c.code} unpublished`
                            : `${c.code} published`,
                        );
                        await refresh();
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : 'Publish failed',
                        );
                      }
                    }}
                  >
                    {c.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  {!c.isDefault && (
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost px-2 py-1 text-xs"
                      onClick={async () => {
                        setError('');
                        try {
                          await api(`/admin/currencies/${c.id}/set-default`, {
                            method: 'POST',
                            token,
                          });
                          setMsg(`${c.code} is now default`);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Set default failed',
                          );
                        }
                      }}
                    >
                      Make default
                    </button>
                  )}
                  {!c.isDefault && (
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost px-2 py-1 text-xs text-red-700"
                      onClick={async () => {
                        setError('');
                        try {
                          await api(`/admin/currencies/${c.id}`, {
                            method: 'DELETE',
                            token,
                          });
                          setMsg(`${c.code} deleted`);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Delete failed',
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {canWrite ? (
            <form onSubmit={addCurrency} className="mt-4 grid gap-2 sm:grid-cols-4">
              <input
                className="hb-input"
                placeholder="Code (GBP)"
                value={curCode}
                onChange={(e) => setCurCode(e.target.value)}
                required
              />
              <input
                className="hb-input"
                placeholder="Symbol (£)"
                value={curSymbol}
                onChange={(e) => setCurSymbol(e.target.value)}
                required
              />
              <input
                className="hb-input"
                placeholder="Name"
                value={curName}
                onChange={(e) => setCurName(e.target.value)}
                required
              />
              <input
                className="hb-input"
                placeholder="Rate vs default"
                value={curRate}
                onChange={(e) => setCurRate(e.target.value)}
                required
              />
              <button className="hb-btn hb-btn-primary sm:col-span-4">
                Add currency
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </>
  );
}
