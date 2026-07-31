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
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 sm:max-w-6xl sm:px-6">
          <Link to={homeTo} aria-label="Home">
            <BrandLogo size="sm" />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-[var(--hb-radius)] px-3 py-2 text-sm font-medium ${
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
          <div className="flex items-center gap-2">
            {session && (
              <span className="hidden text-xs text-[var(--hb-ink)]/55 sm:inline">
                Driver
              </span>
            )}
            <Button variant="tertiary" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:max-w-6xl sm:px-6 sm:py-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <div className="mt-6">{children}</div>
      </main>
      <footer className="mt-auto border-t border-[rgba(26,92,58,0.1)] px-4 py-4 text-xs text-[var(--hb-ink)]/45">
        © {new Date().getFullYear()} Halal Basket · Driver
      </footer>
      <ToastViewport />
    </div>
  );
}
