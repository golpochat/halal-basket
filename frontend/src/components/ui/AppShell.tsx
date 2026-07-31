import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
  children: React.ReactNode;
  homeTo?: string;
}) {
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={homeTo} className="shrink-0">
            <BrandLogo size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
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
          <div className="flex items-center gap-2">
            {session && (
              <span className="hidden text-xs text-[var(--hb-ink)]/55 sm:inline">
                {session.user.email}
              </span>
            )}
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
              onClick={logout}
            >
              Sign out
            </button>
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm md:hidden"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              Menu
            </button>
          </div>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-[rgba(26,92,58,0.08)] px-4 py-3 md:hidden">
            {nav.map((item) => (
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
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight hb-fade-up">
          {title}
        </h1>
        <div className="mt-6 hb-fade-up-delay">{children}</div>
      </main>
    </div>
  );
}
