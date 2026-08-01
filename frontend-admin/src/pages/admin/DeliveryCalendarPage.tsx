import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import { WEEKDAYS, type CalendarAdminRow } from './types';

export function AdminDeliveryCalendarPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <DeliveryCalendarInner />
      </RequireRole>
    </RequireAuth>
  );
}

function DeliveryCalendarInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [calendarRows, setCalendarRows] = useState<CalendarAdminRow[]>([]);
  const [newArea, setNewArea] = useState('');
  const [newDay, setNewDay] = useState<string>('tuesday');

  async function refresh() {
    setCalendarRows(await api<CalendarAdminRow[]>('/admin/delivery-calendar', { token }));
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Delivery calendar</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-semibold">Delivery calendar</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Areas and weekdays for scheduled delivery. Inactive rows are hidden
            from customers.
          </p>
          <ul className="mt-4 space-y-2">
            {calendarRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{row.areaName}</strong>
                  <span className="text-[var(--hb-ink)]/45">
                    {' '}
                    · {row.deliveryDay}
                    {row.isActive ? ' · active' : ' · off'}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="hb-btn hb-btn-ghost px-2 py-1 text-xs"
                    onClick={async () => {
                      setError('');
                      setMsg('');
                      try {
                        await api(`/admin/delivery-calendar/${row.id}/active`, {
                          method: 'PATCH',
                          token,
                          body: JSON.stringify({ isActive: !row.isActive }),
                        });
                        await refresh();
                        setMsg('Calendar updated');
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Failed to update calendar',
                        );
                      }
                    }}
                  >
                    {row.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    className="hb-btn hb-btn-ghost px-2 py-1 text-xs text-red-700"
                    onClick={async () => {
                      setError('');
                      setMsg('');
                      try {
                        await api(`/admin/delivery-calendar/${row.id}`, {
                          method: 'DELETE',
                          token,
                        });
                        await refresh();
                        setMsg('Calendar entry removed');
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Failed to delete calendar entry',
                        );
                      }
                    }}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
            {calendarRows.length === 0 && (
              <li className="text-sm text-[var(--hb-ink)]/55">
                No calendar entries yet.
              </li>
            )}
          </ul>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setMsg('');
              try {
                await api('/admin/delivery-calendar', {
                  method: 'POST',
                  token,
                  body: JSON.stringify({
                    areaName: newArea.trim(),
                    deliveryDay: newDay,
                    isActive: true,
                  }),
                });
                setNewArea('');
                await refresh();
                setMsg('Calendar entry added');
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Failed to add calendar entry',
                );
              }
            }}
          >
            <label className="text-sm">
              Area
              <input
                className="hb-input mt-1.5"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="e.g. Lucan"
                required
              />
            </label>
            <label className="text-sm">
              Delivery day
              <select
                className="hb-input mt-1.5"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="hb-btn hb-btn-primary w-full px-4 py-2 text-sm"
              >
                Add area day
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
