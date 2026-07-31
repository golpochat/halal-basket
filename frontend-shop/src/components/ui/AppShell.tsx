import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button, ToastViewport } from '@halal-basket/web';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';

export type NavItem = { to: string; label: string; end?: boolean };

export function AppShell({
  title,
  nav,
  children,
  homeTo = '/',
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  homeTo?: string;
}) {
  const { session, logout } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.94)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to={homeTo} aria-label="Home">
            <BrandLogo size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-[var(--hb-radius)] px-3 py-2 text-sm font-medium transition ${
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
          <div className="flex items-center gap-2">
            {session && (
              <span className="hidden max-w-[10rem] truncate text-xs text-[var(--hb-ink)]/55 lg:inline">
                {session.user.email}
              </span>
            )}
            <Button variant="tertiary" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-[rgba(26,92,58,0.08)] px-3 py-2 md:hidden"
          aria-label="Mobile primary"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-[var(--hb-radius)] px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                    : 'text-[var(--hb-ink)]/70'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight hb-fade-up">
          {title}
        </h1>
        <div className="mt-6 hb-fade-up-delay">{children}</div>
      </main>
      <footer className="mt-auto border-t border-[rgba(26,92,58,0.1)] px-4 py-4 text-xs text-[var(--hb-ink)]/45 sm:px-6">
        © {new Date().getFullYear()} Halal Basket
      </footer>
      <ToastViewport />
    </div>
  );
}
