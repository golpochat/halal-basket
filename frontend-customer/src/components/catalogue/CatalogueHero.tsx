import { Link } from 'react-router-dom';
import {
  SearchInput,
  CalendarDayIcon,
  ICON_SIZES,
  useCatalogueStore,
  useBrandingQuery,
} from '@halal-basket/web';
import { api } from '../../lib/api';
import { useLocale } from '../../locale/LocaleContext';

const DEFAULT_BG =
  'url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80") center/cover';

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function translateDay(
  raw: string,
  t: (key: string) => string,
): string {
  const d = raw.trim().toLowerCase();
  if (!d) return '';
  if ((DAY_KEYS as readonly string[]).includes(d)) {
    return t(`day.${d}`);
  }
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function CatalogueHero({
  selectedAreaDays,
}: {
  /** Comma-separated delivery days for the selected catalogue area. */
  selectedAreaDays: string | null;
}) {
  const { t, languageCode } = useLocale();
  const search = useCatalogueStore((s) => s.search);
  const setSearch = useCatalogueStore((s) => s.setSearch);
  const area = useCatalogueStore((s) => s.area);
  const branding = useBrandingQuery(api);
  const bgUrl = branding.data?.heroBackgroundUrl;

  // CMS branding copy is English; use packs for other languages.
  const heroTitle =
    languageCode === 'en' && branding.data?.heroTitle?.trim()
      ? branding.data.heroTitle.trim()
      : t('catalogue.heroTitle');
  const heroSubtitle =
    languageCode === 'en' && branding.data?.heroSubtitle?.trim()
      ? branding.data.heroSubtitle.trim()
      : t('catalogue.heroSubtitle');

  const background = bgUrl
    ? `url("${bgUrl}") center/cover`
    : DEFAULT_BG;

  const daysLabel = selectedAreaDays
    ? selectedAreaDays
        .split(',')
        .map((d) => translateDay(d, t))
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
            {t('catalogue.heroSearchAria')}
          </label>
          <SearchInput
            id="hero-search"
            size="lg"
            className="shadow-[var(--hb-shadow-lg)]"
            placeholder={t('catalogue.heroSearchPlaceholder')}
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
                  {t('catalogue.deliveryLine', { area, days: daysLabel })}
                </p>
                <p className="mt-0.5 text-xs text-white/70">
                  {t('catalogue.deliveryHint')}
                </p>
              </div>
              <Link
                to="/delivery-locations"
                className="hb-calendar-strip__cta shrink-0"
              >
                {t('catalogue.allAreasDays')}
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/85">
              {t('catalogue.chooseArea')}{' '}
              <Link
                to="/delivery-locations"
                className="hb-calendar-strip__cta hb-calendar-strip__cta--inline"
              >
                {t('catalogue.allAreasDays')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
