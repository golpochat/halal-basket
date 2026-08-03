import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SearchInput,
  toastError,
  useCatalogueStore,
} from '@halal-basket/web';
import { InfoPageShell } from '../../components/layout/InfoPageShell';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';

type DeliveryConfig = {
  areas: Array<{
    areaName: string;
    deliveryDays: string[];
    deliveryFee?: number;
  }>;
};

const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type WeekDay = (typeof WEEK_DAYS)[number];

function titleCaseDay(day: string) {
  if (!day) return day;
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

function normalizeDay(day: string): string {
  return day.trim().toLowerCase();
}

export function DeliveryLocationsPage() {
  const { formatMoney } = useLocale();
  const navigate = useNavigate();
  const selectedArea = useCatalogueStore((s) => s.area);
  const setArea = useCatalogueStore((s) => s.setArea);
  const goHome = useCatalogueStore((s) => s.goHome);

  const [areas, setAreas] = useState<DeliveryConfig['areas'] | null>(null);
  const [query, setQuery] = useState('');
  const [dayFilter, setDayFilter] = useState<'all' | WeekDay>('all');

  useEffect(() => {
    api<DeliveryConfig>('/platform/delivery-config')
      .then((cfg) => setAreas(cfg.areas))
      .catch((e) => toastError(e, 'Could not load delivery areas'));
  }, []);

  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    const needle = query.trim().toLowerCase();
    return areas.filter((a) => {
      if (needle && !a.areaName.toLowerCase().includes(needle)) return false;
      if (dayFilter === 'all') return true;
      return a.deliveryDays.some((d) => normalizeDay(d) === dayFilter);
    });
  }, [areas, query, dayFilter]);

  const groupedByDay = useMemo(() => {
    const groups: Array<{ day: WeekDay; areas: DeliveryConfig['areas'] }> = [];
    for (const day of WEEK_DAYS) {
      const list = filteredAreas.filter((a) =>
        a.deliveryDays.some((d) => normalizeDay(d) === day),
      );
      if (list.length === 0) continue;
      groups.push({
        day,
        areas: [...list].sort((a, b) =>
          a.areaName.localeCompare(b.areaName),
        ),
      });
    }
    return groups;
  }, [filteredAreas]);

  function shopArea(areaName: string) {
    setArea(areaName);
    goHome();
    navigate('/');
  }

  function feeLabel(fee: number | undefined) {
    if (fee == null) return '—';
    if (fee === 0) return 'Free';
    return formatMoney(fee);
  }

  return (
    <InfoPageShell
      wide
      title="Delivery locations"
      subtitle="Find your area, delivery day, and fee — then shop that zone."
    >
      {areas === null && (
        <p className="text-sm text-[var(--hb-ink)]/55">Loading areas…</p>
      )}

      {areas && areas.length === 0 && (
        <p className="text-sm text-[var(--hb-ink)]/65">
          No delivery areas are configured yet. Pickup may still be available
          where offered.
        </p>
      )}

      {areas && areas.length > 0 && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-md">
              <label className="sr-only" htmlFor="delivery-area-search">
                Search delivery areas
              </label>
              <SearchInput
                id="delivery-area-search"
                placeholder="Search area…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <p className="text-sm text-[var(--hb-ink)]/55">
              {filteredAreas.length} of {areas.length} areas
              {selectedArea ? ` · Shopping ${selectedArea}` : ''}
            </p>
          </div>

          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by delivery day"
          >
            <button
              type="button"
              className={`hb-btn px-3 py-1.5 text-xs ${
                dayFilter === 'all' ? 'hb-btn-primary' : 'hb-btn-ghost'
              }`}
              aria-pressed={dayFilter === 'all'}
              onClick={() => setDayFilter('all')}
            >
              All days
            </button>
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`hb-btn px-3 py-1.5 text-xs ${
                  dayFilter === day ? 'hb-btn-primary' : 'hb-btn-ghost'
                }`}
                aria-pressed={dayFilter === day}
                onClick={() => setDayFilter(day)}
              >
                {titleCaseDay(day).slice(0, 3)}
              </button>
            ))}
          </div>

          {filteredAreas.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--hb-ink)]/65">
              No areas match that search or day. Try another filter.
            </p>
          ) : (
            <div className="mt-8 space-y-8">
              {groupedByDay.map(({ day, areas: dayAreas }) => (
                <section key={day} aria-labelledby={`delivery-day-${day}`}>
                  <h2
                    id={`delivery-day-${day}`}
                    className="font-display text-xl font-semibold tracking-tight text-[var(--hb-ink)]"
                  >
                    {titleCaseDay(day)}
                  </h2>
                  <ul className="mt-3 divide-y divide-[rgba(26,92,58,0.1)] overflow-hidden rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white/80">
                    {dayAreas.map((a) => {
                      const isSelected =
                        selectedArea.trim().toLowerCase() ===
                        a.areaName.trim().toLowerCase();
                      return (
                        <li
                          key={`${day}-${a.areaName}`}
                          className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                            isSelected ? 'bg-[rgba(26,92,58,0.06)]' : ''
                          }`}
                          aria-current={isSelected ? 'true' : undefined}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--hb-ink)]">
                              {a.areaName}
                              {isSelected ? (
                                <span className="ml-2 text-xs font-medium text-[var(--hb-green)]">
                                  Selected
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-sm text-[var(--hb-ink)]/60">
                              {a.deliveryDays.map(titleCaseDay).join(' · ')}
                              <span className="text-[var(--hb-ink)]/35">
                                {' '}
                                · fee {feeLabel(a.deliveryFee)}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            className="hb-btn hb-btn-primary h-9 shrink-0 px-3 text-sm"
                            onClick={() => shopArea(a.areaName)}
                          >
                            {isSelected ? 'Continue shopping' : 'Shop this area'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-sm leading-relaxed text-[var(--hb-ink)]/60">
        Outside these areas, scheduled delivery is not available yet. Pickup from
        Halal Basket still works where offered.
      </p>

      <div className="mt-12 flex flex-col gap-4 border-t border-[rgba(26,92,58,0.1)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--hb-ink)]/55">
          See{' '}
          <Link
            to="/delivery-charges"
            className="font-semibold text-[var(--hb-green)]"
          >
            Delivery charges
          </Link>{' '}
          or the{' '}
          <Link to="/faq" className="font-semibold text-[var(--hb-green)]">
            FAQ
          </Link>
          .
        </p>
        <Link to="/" className="hb-btn hb-btn-primary h-10 px-4 text-sm">
          Shop now
        </Link>
      </div>
    </InfoPageShell>
  );
}
