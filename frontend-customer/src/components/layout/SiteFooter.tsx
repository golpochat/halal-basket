import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';
import { api } from '../../lib/api';
import { openCookiePreferences } from '../../lib/cookie-consent';
import { useLocale } from '../../locale/LocaleContext';
import { HB_CHROME_FOOTER_GRID, HB_CHROME_PAD } from './chrome';

const linkClass =
  'block rounded-[var(--hb-radius)] py-2 text-sm font-medium text-[var(--hb-ink)]/70 transition duration-[220ms] ease-[var(--hb-ease-out)] hover:text-[var(--hb-green)]';

const headingClass =
  'text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45';

type FooterLegal = { slug: string; title: string; sortOrder: number };

const LEGAL_TITLE_KEYS: Record<string, string> = {
  privacy: 'footer.privacy',
  terms: 'footer.terms',
  cookies: 'footer.cookies',
  refunds: 'footer.refunds',
};

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { t, languageCode } = useLocale();
  const [legal, setLegal] = useState<FooterLegal[]>([]);

  useEffect(() => {
    api<FooterLegal[]>('/platform/legal')
      .then(setLegal)
      .catch(() => setLegal([]));
  }, []);

  function legalLabel(doc: FooterLegal): string {
    const key = LEGAL_TITLE_KEYS[doc.slug];
    if (key && languageCode !== 'en') return t(key);
    if (key && !doc.title.trim()) return t(key);
    return doc.title.trim() || (key ? t(key) : doc.slug);
  }

  return (
    <footer className="mt-auto w-full shrink-0 border-t border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.9)]">
      <div className={`${HB_CHROME_FOOTER_GRID} ${HB_CHROME_PAD}`}>
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandLogo size="lg" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--hb-ink)]/60">
            {t('footer.tagline')}
          </p>
        </div>

        <div>
          <h2 className={headingClass}>{t('footer.shop')}</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <Link to="/" className={linkClass}>
                {t('footer.home')}
              </Link>
            </li>
            <li>
              <Link to="/faq" className={linkClass}>
                {t('footer.faq')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className={headingClass}>{t('footer.delivery')}</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <Link to="/delivery-locations" className={linkClass}>
                {t('footer.deliveryLocations')}
              </Link>
            </li>
            <li>
              <Link to="/delivery-charges" className={linkClass}>
                {t('footer.deliveryCharges')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className={headingClass}>{t('footer.legal')}</h2>
          <ul className="mt-3 space-y-1">
            {legal.length === 0 ? (
              <>
                <li>
                  <Link to="/legal/privacy" className={linkClass}>
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <Link to="/legal/terms" className={linkClass}>
                    {t('footer.terms')}
                  </Link>
                </li>
              </>
            ) : (
              legal.map((d) => (
                <li key={d.slug}>
                  <Link to={`/legal/${d.slug}`} className={linkClass}>
                    {legalLabel(d)}
                  </Link>
                </li>
              ))
            )}
            <li>
              <button
                type="button"
                className={`${linkClass} w-full text-left`}
                onClick={() => openCookiePreferences()}
              >
                {t('footer.cookiePreferences')}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[rgba(26,92,58,0.1)] bg-[rgba(19,38,28,0.04)]">
        <div
          className={`py-4 text-center text-xs text-[var(--hb-ink)]/50 ${HB_CHROME_PAD}`}
        >
          <p>{t('footer.copyright', { year })}</p>
        </div>
      </div>
    </footer>
  );
}
