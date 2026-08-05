import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IconButton,
  SearchInput,
  LocationSelect,
  UtilityIcons,
  ICON_SIZES,
  useCatalogueStore,
} from '@halal-basket/web';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { ProfileMenu } from './ProfileMenu';
import { LocalePickers } from '../LocalePickers';
import { HB_CHROME_BAR } from './chrome';

type AppHeaderProps = {
  areas: string[];
  showNavSearch?: boolean;
};

export function AppHeader({ areas, showNavSearch = false }: AppHeaderProps) {
  const { session } = useAuth();
  const { t } = useLocale();
  const area = useCatalogueStore((s) => s.area);
  const setArea = useCatalogueStore((s) => s.setArea);
  const search = useCatalogueStore((s) => s.search);
  const setSearch = useCatalogueStore((s) => s.setSearch);
  const goHome = useCatalogueStore((s) => s.goHome);
  const sidebarOpen = useCatalogueStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useCatalogueStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useCatalogueStore((s) => s.toggleSidebar);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const menuExpanded = isDesktop ? !sidebarCollapsed : sidebarOpen;

  return (
    <header className="hb-header-shell sticky top-0 z-40 bg-[rgba(247,250,246,0.97)] backdrop-blur-md">
      <div className={HB_CHROME_BAR}>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link
            to="/"
            className="shrink-0"
            aria-label={t('chrome.homeAria')}
            onClick={() => goHome()}
          >
            <BrandLogo size="lg" />
          </Link>

          <IconButton
            label={
              menuExpanded
                ? t('chrome.collapseCategories')
                : t('chrome.expandCategories')
            }
            aria-expanded={menuExpanded}
            aria-controls="category-sidebar"
            onClick={() => toggleSidebar()}
          >
            <span
              className={`hb-menu-swap ${menuExpanded ? 'is-expanded' : ''}`}
              aria-hidden
            >
              <span className="hb-menu-swap__a">
                {UtilityIcons.close({ size: ICON_SIZES.sm })}
              </span>
              <span className="hb-menu-swap__b">
                {UtilityIcons.menu({ size: ICON_SIZES.sm })}
              </span>
            </span>
          </IconButton>
        </div>

        {areas.length > 0 && (
          <LocationSelect
            variant="pill"
            value={area}
            options={areas}
            onChange={setArea}
            label={t('chrome.deliveryArea')}
          />
        )}

        {showNavSearch ? (
          <div className="mx-2 hidden min-w-0 max-w-xl flex-1 md:block">
            <SearchInput
              placeholder={t('chrome.searchProducts')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('chrome.searchAria')}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <LocalePickers />
          {showNavSearch && (
            <div className="w-[7.5rem] sm:w-40 md:hidden">
              <SearchInput
                placeholder={t('chrome.searchShort')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('chrome.searchAria')}
              />
            </div>
          )}

          {!session ? (
            <>
              <Link
                to="/login"
                className="hb-btn hb-btn-ghost h-10 px-3.5 text-sm"
              >
                {t('chrome.signIn')}
              </Link>
              <Link
                to="/register"
                className="hb-btn hb-btn-primary h-10 px-3.5 text-sm"
              >
                {t('chrome.signUp')}
              </Link>
            </>
          ) : (
            <ProfileMenu />
          )}
        </div>
      </div>
    </header>
  );
}
