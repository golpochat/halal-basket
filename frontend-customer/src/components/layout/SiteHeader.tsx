import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { IconButton, UtilityIcons, ICON_SIZES } from '@halal-basket/web';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { ProfileMenu } from './ProfileMenu';
import { HB_CHROME_BAR } from './chrome';

export type SiteNavItem = { to: string; label: string; end?: boolean };

type SiteHeaderProps = {
  homeTo?: string;
  nav?: SiteNavItem[];
  actions?: ReactNode;
  /** site = marketing/customer; app = dashboard; slim = auth/checkout chrome */
  variant?: 'site' | 'app' | 'slim';
  showAuth?: boolean;
};

export function SiteHeader({
  homeTo = '/',
  nav = [],
  actions,
  variant = 'site',
  showAuth = true,
}: SiteHeaderProps) {
  const { session } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isApp = variant === 'app';
  const isSlim = variant === 'slim';
  const onLogin = location.pathname.startsWith('/login');
  const onRegister = location.pathname.startsWith('/register');

  const links: SiteNavItem[] = nav;

  const showGuestAuth = !session && (isSlim || (showAuth && !isApp));
  // Only open a drawer when a page passes explicit nav items
  const showMobileMenu = !isSlim && links.length > 0;

  // Close drawer when crossing into desktop — avoids leftover open state
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const guestAuthLinks = (
    <>
      {!onLogin && (
        <Link
          to="/login"
          className="hb-btn hb-btn-ghost h-10 px-3.5 text-sm"
          onClick={() => setOpen(false)}
        >
          {t('chrome.signIn')}
        </Link>
      )}
      {!onRegister && (
        <Link
          to="/register"
          className="hb-btn hb-btn-primary h-10 px-3.5 text-sm"
          onClick={() => setOpen(false)}
        >
          {t('chrome.signUp')}
        </Link>
      )}
    </>
  );

  return (
    <header className="hb-header-shell sticky top-0 z-40 bg-[rgba(247,250,246,0.97)] backdrop-blur-md">
      <div className={HB_CHROME_BAR}>
        <Link
          to={homeTo}
          className="shrink-0"
          onClick={() => setOpen(false)}
          aria-label={t('chrome.homeAria')}
        >
          <BrandLogo size="lg" />
        </Link>

        {links.length > 0 && (
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary"
          >
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-[var(--hb-radius)] px-3 py-2 text-sm font-semibold transition duration-[220ms] ease-[var(--hb-ease-out)] ${
                    isActive
                      ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                      : 'text-[var(--hb-ink)]/70 hover:bg-[var(--hb-mist)] hover:text-[var(--hb-green)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-2">
          {actions}

          {showGuestAuth && (
            <div className="flex items-center gap-2">{guestAuthLinks}</div>
          )}

          {session && showAuth && <ProfileMenu />}

          {showMobileMenu && (
            <div className="md:hidden">
              <IconButton
                label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open
                  ? UtilityIcons.close({ size: ICON_SIZES.sm })
                  : UtilityIcons.menu({ size: ICON_SIZES.sm })}
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {open && showMobileMenu && (
        <div className="border-t border-[rgba(26,92,58,0.08)] px-3 py-3 sm:px-4 md:hidden lg:px-6">
          <nav className="flex flex-col gap-1" aria-label="Mobile primary">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-[var(--hb-radius)] px-3 py-2.5 text-sm font-semibold ${
                    isActive
                      ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                      : 'text-[var(--hb-ink)]/80'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
