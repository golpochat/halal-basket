import { Link } from 'react-router-dom';
import {
  SearchInput,
  CalendarDayIcon,
  ICON_SIZES,
  useCatalogueStore,
  useBrandingQuery,
} from '@halal-basket/web';
import { api } from '../../lib/api';

const DEFAULT_BG =
  'url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80") center/cover';

function formatDay(raw: string) {
  const d = raw.trim().toLowerCase();
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function CatalogueHero({
  selectedAreaDays,
}: {
  /** Comma-separated delivery days for the selected catalogue area. */
  selectedAreaDays: string | null;
}) {
  const search = useCatalogueStore((s) => s.search);
  const setSearch = useCatalogueStore((s) => s.setSearch);
  const area = useCatalogueStore((s) => s.area);
  const branding = useBrandingQuery(api);
  const bgUrl = branding.data?.heroBackgroundUrl;
  const heroTitle =
    branding.data?.heroTitle?.trim() ||
    'Halal groceries delivered or ready for pickup';
  const heroSubtitle =
    branding.data?.heroSubtitle?.trim() ||
    'From trusted local halal shops in Dublin';

  const background = bgUrl
    ? `url("${bgUrl}") center/cover`
    : DEFAULT_BG;

  const daysLabel = selectedAreaDays
    ? selectedAreaDays
        .split(',')
        .map((d) => formatDay(d))
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <section
      className="relative overflow-hidden border-b border-[rgba(26,92,58,0.08)]"
      style={{ background }}
      aria-labelledby="catalogue-hero-heading"
    >
      <div className="hb-hero-scrim" aria-hidden />

      <div className="hb-hero-content px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <h1
          id="catalogue-hero-heading"
          className="max-w-3xl font-display text-[clamp(1.85rem,2.2vw+1.2rem,3.25rem)] font-bold leading-[1.12] tracking-tight text-balance text-white drop-shadow-sm"
        >
          {heroTitle}
        </h1>
        <p className="mt-5 max-w-3xl text-[clamp(1rem,0.35vw+0.9rem,1.125rem)] font-normal leading-relaxed text-white/90">
          {heroSubtitle}
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

        <div className="mt-6 max-w-3xl">
          {area && daysLabel ? (
            <div className="hb-calendar-strip">
              <span
                className="inline-flex shrink-0 rounded-[10px] bg-white/95 p-1.5 shadow-[var(--hb-icon-shadow)]"
                aria-hidden
              >
                <CalendarDayIcon size={ICON_SIZES.md} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/95">
                  <strong className="font-semibold">{area}</strong>
                  <span className="text-white/80"> — delivery </span>
                  <strong className="font-semibold">{daysLabel}</strong>
                </p>
                <p className="mt-0.5 text-xs text-white/70">
                  Change area from the header pin, or browse all schedules.
                </p>
              </div>
              <Link
                to="/delivery-locations"
                className="hb-calendar-strip__cta shrink-0"
              >
                All areas &amp; days
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/85">
              Choose your area in the header to see your delivery day.{' '}
              <Link
                to="/delivery-locations"
                className="hb-calendar-strip__cta hb-calendar-strip__cta--inline"
              >
                All areas &amp; days
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
