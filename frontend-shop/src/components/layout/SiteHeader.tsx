import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { homeForRole } from '../../lib/api';

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
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const isApp = variant === 'app';
  const isSlim = variant === 'slim';

  const links: SiteNavItem[] = nav.length > 0 ? nav : [];

  const showMobileMenu =
    links.length > 0 || (showAuth && !isApp && !isSlim);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.92)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to={homeTo}
          className="shrink-0"
          onClick={() => setOpen(false)}
          aria-label="Halal Basket home"
        >
          <BrandLogo size="sm" />
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
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                      : 'text-[var(--hb-ink)]/70 hover:bg-white/70'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          {actions}

          {isSlim && (
            <Link
              to="/help"
              className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
            >
              Help
            </Link>
          )}

          {showAuth && !isApp && !isSlim && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {session ? (
                <>
                  <Link
                    to={homeForRole(session.user.role)}
                    className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
                    onClick={logout}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/login"
                    className="hb-btn hb-btn-primary px-3 py-1.5 text-sm"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}

          {isSlim && showAuth && session && (
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
              onClick={logout}
            >
              Sign out
            </button>
          )}

          {isApp && session && (
            <>
              <span
                className="hidden max-w-[10rem] truncate text-xs text-[var(--hb-ink)]/55 lg:inline"
                title={session.user.email}
              >
                {session.user.email}
              </span>
              <button
                type="button"
                className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
                onClick={logout}
              >
                Sign out
              </button>
            </>
          )}

          {showMobileMenu && (
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm md:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Close' : 'Menu'}
            </button>
          )}
        </div>
      </div>

      {open && showMobileMenu && (
        <div className="border-t border-[rgba(26,92,58,0.08)] px-4 py-3 md:hidden">
          {links.length > 0 && (
            <nav className="flex flex-col gap-1" aria-label="Mobile primary">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium ${
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
          )}

          {showAuth && !isApp && !isSlim && (
            <div className="mt-2 flex flex-col gap-1 border-t border-[rgba(26,92,58,0.08)] pt-2 sm:hidden">
              {session ? (
                <>
                  <Link
                    to={homeForRole(session.user.role)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
