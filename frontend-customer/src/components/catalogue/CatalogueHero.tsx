import {
  SearchInput,
  CalendarDayIcon,
  TRUST_ITEMS,
  ICON_SIZES,
  useCatalogueStore,
  useBrandingQuery,
} from '@halal-basket/web';
import { api } from '../../lib/api';

const DEFAULT_BG =
  'linear-gradient(135deg, rgba(26,92,58,0.88) 0%, rgba(19,38,28,0.75) 45%, rgba(47,143,91,0.7) 100%), url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80") center/cover';

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
    ? `linear-gradient(135deg, rgba(19,38,28,0.72) 0%, rgba(26,92,58,0.55) 100%), url("${bgUrl}") center/cover`
    : DEFAULT_BG;

  return (
    <section
      className="relative overflow-hidden border-b border-[rgba(26,92,58,0.08)]"
      style={{ background }}
      aria-labelledby="catalogue-hero-heading"
    >
      <div className="relative px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
          Dublin pilot
        </p>
        <h1
          id="catalogue-hero-heading"
          className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl"
        >
          Halal groceries delivered or ready for pickup
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
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
          className="mt-8 flex flex-wrap gap-3 sm:gap-4"
          aria-label="Trust indicators"
        >
          {TRUST_ITEMS.map(({ id, label, Icon }) => (
            <li
              key={id}
              className="hb-fade-up flex items-center gap-[var(--hb-icon-gap)] rounded-[var(--hb-radius)] border border-white/20 bg-white/95 px-3 py-2 text-sm font-semibold text-[var(--hb-ink)] shadow-[var(--hb-icon-shadow)] backdrop-blur-sm"
            >
              <Icon size={ICON_SIZES.sm} />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        {areaSummary.length > 0 && (
          <div className="hb-fade-up-delay mt-8 max-w-3xl">
            <div className="mb-3 flex items-center gap-[var(--hb-icon-gap)]">
              <span className="inline-flex rounded-[var(--hb-radius)] bg-white/95 p-1.5 shadow-[var(--hb-icon-shadow)]">
                <CalendarDayIcon size={ICON_SIZES.sm} />
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                Delivery calendar
              </h2>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {areaSummary.map((a) => (
                <li
                  key={a.name}
                  className="flex items-center gap-3 rounded-[var(--hb-radius)] border border-white/20 bg-white/12 px-3 py-2.5 text-white backdrop-blur-sm"
                >
                  <CalendarDayIcon
                    size={20}
                    color="#F9A825"
                    className="shrink-0 drop-shadow-none"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="text-xs text-white/75">
                      {a.days
                        .split(',')
                        .map((d) => formatDay(d))
                        .join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
