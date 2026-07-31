import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SearchInput,
  LocationSelect,
  UtilityIcons,
  ICON_SIZES,
  useCatalogueStore,
  useCartStore,
  homeForRole,
} from '@halal-basket/web';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';

type AppHeaderProps = {
  areas: string[];
  showNavSearch?: boolean;
};

const authLinkClass =
  'inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--hb-radius)] px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)]';

export function AppHeader({ areas, showNavSearch = false }: AppHeaderProps) {
  const { session, logout } = useAuth();
  const { formatMoney } = useLocale();
  const area = useCatalogueStore((s) => s.area);
  const setArea = useCatalogueStore((s) => s.setArea);
  const search = useCatalogueStore((s) => s.search);
  const setSearch = useCatalogueStore((s) => s.setSearch);
  const goHome = useCatalogueStore((s) => s.goHome);
  const sidebarOpen = useCatalogueStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useCatalogueStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useCatalogueStore((s) => s.toggleSidebar);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const cartCount = useCartStore((s) =>
    s.lines.reduce((a, l) => a + l.quantity, 0),
  );
  const cartTotal = useCartStore((s) =>
    s.lines.reduce((a, l) => a + l.price * l.quantity, 0),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const menuExpanded = isDesktop ? !sidebarCollapsed : sidebarOpen;

  return (
    <header className="sticky top-0 z-40 overflow-visible border-b border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.97)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
        <button
          type="button"
          className="hb-icon-btn"
          aria-label={menuExpanded ? 'Collapse categories' : 'Expand categories'}
          aria-expanded={menuExpanded}
          aria-controls="category-sidebar"
          onClick={() => toggleSidebar()}
        >
          {UtilityIcons.menu({ size: ICON_SIZES.sm })}
        </button>

        <Link
          to="/"
          className="shrink-0"
          aria-label="Halal Basket home"
          onClick={() => goHome()}
        >
          <BrandLogo size="sm" />
        </Link>

        {areas.length > 0 && (
          <LocationSelect
            variant="pill"
            value={area}
            options={areas}
            onChange={setArea}
            label="Delivery area"
          />
        )}

        {showNavSearch ? (
          <div className="mx-2 hidden min-w-0 max-w-xl flex-1 md:block">
            <SearchInput
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showNavSearch && (
            <div className="w-[7.5rem] sm:w-40 md:hidden">
              <SearchInput
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
              />
            </div>
          )}

          {!session ? (
            <>
              <Link
                to="/login"
                className={`${authLinkClass} text-[var(--hb-green)] hover:bg-[var(--hb-mist)]`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className={`${authLinkClass} bg-[var(--hb-green)] text-white hover:bg-[var(--hb-green-hover)]`}
              >
                Sign up
              </Link>
            </>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.18)] bg-white px-2.5 text-sm font-semibold text-[var(--hb-ink)] transition hover:border-[var(--hb-leaf)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)]"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--hb-mist)] text-xs font-bold text-[var(--hb-green)]">
                  {session.user.email.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[8rem] truncate sm:inline">
                  {session.user.email}
                </span>
                <span className="hidden text-[var(--hb-ink)]/55 sm:inline">
                  {UtilityIcons.chevronDown({ size: 14 })}
                </span>
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-[45] mt-1.5 w-52 overflow-hidden rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.18)] bg-white py-1 shadow-[var(--hb-shadow-lg)]"
                >
                  {session.user.role === 'customer' && (
                    <Link
                      role="menuitem"
                      to="/orders"
                      className="flex h-10 items-center px-3 text-sm font-semibold hover:bg-[var(--hb-mist)]"
                      onClick={() => setProfileOpen(false)}
                    >
                      My orders
                    </Link>
                  )}
                  {(session.user.role === 'admin' ||
                    session.user.role === 'super_admin') && (
                    <Link
                      role="menuitem"
                      to={homeForRole(session.user.role)}
                      className="flex h-10 items-center px-3 text-sm font-semibold hover:bg-[var(--hb-mist)]"
                      onClick={() => setProfileOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex h-10 w-full items-center px-3 text-left text-sm font-semibold hover:bg-[var(--hb-mist)]"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="hb-icon-btn relative"
            aria-label={`Open cart, ${cartCount} items, ${formatMoney(cartTotal)}`}
            onClick={() => setCartOpen(true)}
          >
            {UtilityIcons.cart({ size: ICON_SIZES.sm })}
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--hb-green)] px-1 text-[10px] font-bold leading-none text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
