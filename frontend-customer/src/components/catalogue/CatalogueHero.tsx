import {
  SearchInput,
  CalendarDayIcon,
  LocationPinIcon,
  TRUST_ITEMS,
  ICON_SIZES,
  useCatalogueStore,
  useBrandingQuery,
} from '@halal-basket/web';
import { api } from '../../lib/api';

const DEFAULT_BG =
  'url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80") center/cover';

function formatDay(raw: string) {
  const d = raw.trim();
  return d.charAt(0).toUpperCase() + d.slice(1, 3);
}

export function CatalogueHero({
  areaSummary,
}: {
  areaSummary: Array<{ name: string; days: string }>;
}) {
  const search = useCatalogueStore((s) => s.search);
  const setSearch = useCatalogueStore((s) => s.setSearch);
  const area = useCatalogueStore((s) => s.area);
  const branding = useBrandingQuery(api);
  const bgUrl = branding.data?.heroBackgroundUrl;

  const background = bgUrl
    ? `url("${bgUrl}") center/cover`
    : DEFAULT_BG;

  return (
    <section
      className="relative overflow-hidden border-b border-[rgba(26,92,58,0.08)]"
      style={{ background }}
      aria-labelledby="catalogue-hero-heading"
    >
      <div className="hb-hero-scrim" aria-hidden />

      <div className="hb-hero-content px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90 drop-shadow-sm">
          Dublin pilot
        </p>
        <h1
          id="catalogue-hero-heading"
          className="mt-3 max-w-3xl font-display text-[2.35rem] font-bold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[3.25rem]"
        >
          Halal groceries delivered or ready for pickup
        </h1>
        <p className="mt-5 max-w-2xl text-base font-normal leading-relaxed text-white/90 sm:text-lg">
          From trusted local halal shops in Dublin
          {area ? ` · Serving ${area}` : ''}
        </p>

        <div className="mt-8 w-full max-w-3xl">
          <label className="sr-only" htmlFor="hero-search">
            Search products
          </label>
          <SearchInput
            id="hero-search"
            size="lg"
            className="shadow-[var(--hb-shadow-lg)]"
            placeholder="Search rice, chicken, oil…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        <ul
          className="mt-5 flex flex-wrap gap-3 sm:mt-6"
          aria-label="Trust indicators"
        >
          {TRUST_ITEMS.map(({ id, label, Icon }) => (
            <li key={id}>
              <span className="hb-trust-chip">
                <Icon size={ICON_SIZES.md} title={label} />
                <span>{label}</span>
              </span>
            </li>
          ))}
        </ul>

        {areaSummary.length > 0 && (
          <div className="mt-8 border-t border-white/25 pt-8 sm:mt-10 sm:pt-10">
            <div className="hb-calendar-card max-w-3xl">
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="inline-flex rounded-[10px] bg-white/95 p-1.5 shadow-[var(--hb-icon-shadow)]"
                  aria-hidden
                >
                  <CalendarDayIcon size={ICON_SIZES.md} />
                </span>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                  Delivery calendar
                </h2>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {areaSummary.map((a) => {
                  const isActive =
                    area.trim().toLowerCase() === a.name.trim().toLowerCase();
                  return (
                    <li
                      key={a.name}
                      className={`hb-calendar-row ${isActive ? 'is-active' : ''}`}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <LocationPinIcon
                        size={ICON_SIZES.md}
                        title={`${a.name} delivery area`}
                        className="shrink-0 drop-shadow-none"
                      />
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}
                        >
                          {a.name}
                        </p>
                        <p className="text-xs text-white/80">
                          {a.days
                            .split(',')
                            .map((d) => formatDay(d))
                            .join(' · ')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
