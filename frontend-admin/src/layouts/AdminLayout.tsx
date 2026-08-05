import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { LocalePickers } from '../components/LocalePickers';

type NavDef = DashboardNavItem & {
  permission?: string;
  /** Only visible to portal super_admin (not staff with overlapping perms). */
  superOnly?: boolean;
};

const WORK_PATH_SUFFIXES = [
  '/ops',
  '/analytics',
  '/shops',
  '/catalogue',
  '/delivery-fees',
  '/promotions',
  '/currencies',
  '/languages',
  '/driver-activity',
] as const;

const PLATFORM_PATH_SUFFIXES = [
  '/roles',
  '/users',
  '/shop-users',
  '/drivers',
  '/warehouse',
  '/branding',
  '/featured',
  '/legal',
  '/gdpr',
  '/whatsapp',
  '/ops-drill',
] as const;

function storageKeyFor(isSuper: boolean) {
  return isSuper ? 'hb-nav-show-secondary-super' : 'hb-nav-show-secondary-admin';
}

function eventNameFor(isSuper: boolean) {
  return isSuper ? 'hb-nav-show-secondary-super' : 'hb-nav-show-secondary-admin';
}

function readPinned(isSuper: boolean): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(storageKeyFor(isSuper)) === '1';
}

function pathMatches(
  pathname: string,
  base: string,
  suffixes: readonly string[],
) {
  return suffixes.some(
    (suffix) =>
      pathname === `${base}${suffix}` ||
      pathname.startsWith(`${base}${suffix}/`),
  );
}

function canSee(item: NavDef, opts: { isSuper: boolean; permissions: string[] }) {
  if (item.superOnly && !opts.isSuper) return false;
  return (
    opts.isSuper ||
    !item.permission ||
    opts.permissions.includes(item.permission)
  );
}

function platformNav(base: string): NavDef[] {
  return [
    {
      to: `${base}/roles`,
      label: 'Roles & permissions',
      icon: 'shield',
      permission: 'roles.read',
    },
    {
      to: `${base}/users`,
      label: 'Admin users',
      icon: 'users',
      superOnly: true,
    },
    {
      to: `${base}/shop-users`,
      label: 'Shop logins',
      icon: 'store',
      superOnly: true,
    },
    {
      to: `${base}/drivers`,
      label: 'Driver logins',
      icon: 'users',
      superOnly: true,
    },
    {
      to: `${base}/warehouse`,
      label: 'Warehouses',
      icon: 'building',
      permission: 'warehouses.read',
    },
    {
      to: `${base}/branding`,
      label: 'Branding',
      icon: 'spark',
      permission: 'branding.read',
    },
    {
      to: `${base}/featured`,
      label: 'Featured categories',
      icon: 'spark',
      permission: 'branding.read',
    },
    {
      to: `${base}/legal`,
      label: 'Legal pages',
      icon: 'list',
      permission: 'legal.read',
    },
    {
      to: `${base}/gdpr`,
      label: 'Privacy',
      icon: 'shield',
      permission: 'gdpr.read',
    },
    {
      to: `${base}/whatsapp`,
      label: 'WhatsApp',
      icon: 'phone',
      permission: 'whatsapp.read',
    },
    {
      to: `${base}/ops-drill`,
      label: 'Alert drill',
      icon: 'settings',
      superOnly: true,
    },
  ];
}

function workNav(base: string): NavDef[] {
  return [
    { to: `${base}/ops`, label: 'Ops', icon: 'list', permission: 'ops.read' },
    {
      to: `${base}/analytics`,
      label: 'Analytics',
      icon: 'chart',
      permission: 'analytics.read',
    },
    {
      to: `${base}/shops`,
      label: 'Partner shops',
      icon: 'store',
      permission: 'shops.read',
    },
    {
      to: `${base}/catalogue`,
      label: 'Catalogue',
      icon: 'package',
      permission: 'catalogue.read',
    },
    {
      to: `${base}/driver-activity`,
      label: 'Driver activity',
      icon: 'users',
      permission: 'drivers.read',
    },
    {
      to: `${base}/delivery-fees`,
      label: 'Location & fees',
      icon: 'tag',
      permission: 'locations.read',
    },
    {
      to: `${base}/promotions`,
      label: 'Promotions',
      icon: 'tag',
      permission: 'promotions.read',
    },
    {
      to: `${base}/currencies`,
      label: 'Currencies',
      icon: 'globe',
      permission: 'currencies.read',
    },
    {
      to: `${base}/languages`,
      label: 'Languages',
      icon: 'globe',
      permission: 'languages.read',
    },
  ];
}

function buildNav(
  base: string,
  opts: {
    isSuper: boolean;
    permissions: string[];
    includeSecondary: boolean;
  },
): DashboardNavItem[] {
  const access = { isSuper: opts.isSuper, permissions: opts.permissions };
  const primary = opts.isSuper ? platformNav(base) : workNav(base);
  const secondary = opts.isSuper ? workNav(base) : platformNav(base);

  const items: NavDef[] = [
    {
      to: `${base}/dashboard`,
      label: 'Dashboard',
      end: true,
      icon: 'home',
    },
    ...primary.filter((i) => canSee(i, access)),
    ...(opts.includeSecondary
      ? secondary.filter((i) => canSee(i, access))
      : []),
  ];

  return items.map(({ permission: _p, superOnly: _s, ...item }) => item);
}

function secondaryToggleLabel(opts: {
  isSuper: boolean;
  pinned: boolean;
  onSecondaryPath: boolean;
}) {
  const group = opts.isSuper ? 'operations' : 'platform tools';
  if (opts.pinned) return `Hide ${group}`;
  if (opts.onSecondaryPath) return `Pin ${group} in sidebar`;
  return `Show ${group}`;
}

export function AdminAreaLayout() {
  return (
    <RequireAuth>
      <RequireRole roles={['admin', 'super_admin']}>
        <AdminShell expectedRole="admin" base="/admin" />
      </RequireRole>
    </RequireAuth>
  );
}

export function SuperAdminAreaLayout() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <AdminShell expectedRole="super_admin" base="/super-admin" />
      </RequireRole>
    </RequireAuth>
  );
}

function AdminShell({
  expectedRole,
  base,
}: {
  expectedRole: 'admin' | 'super_admin';
  base: string;
}) {
  const { session, logout } = useAuth();
  const location = useLocation();
  const role = session?.user.role;
  const isSuper = role === 'super_admin';
  const permissions = session?.permissions ?? [];
  const [pinnedSecondary, setPinnedSecondary] = useState(() =>
    readPinned(isSuper),
  );

  // Re-read when switching between admin/super shells is unlikely in one mount,
  // but keep preference scoped to portal role.
  useEffect(() => {
    setPinnedSecondary(readPinned(isSuper));
  }, [isSuper]);

  const onWorkPath = pathMatches(location.pathname, base, WORK_PATH_SUFFIXES);
  const onPlatformPath = pathMatches(
    location.pathname,
    base,
    PLATFORM_PATH_SUFFIXES,
  );
  const onSecondaryPath = isSuper ? onWorkPath : onPlatformPath;

  const access = { isSuper, permissions };
  const secondaryDefs = (isSuper ? workNav(base) : platformNav(base)).filter(
    (i) => canSee(i, access),
  );
  const hasSecondary = secondaryDefs.length > 0;

  const includeSecondary =
    !hasSecondary || pinnedSecondary || onSecondaryPath;

  const nav = useMemo(
    () =>
      buildNav(base, {
        isSuper,
        permissions,
        includeSecondary,
      }),
    [base, isSuper, permissions, includeSecondary],
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-role',
      isSuper ? 'super_admin' : 'admin',
    );
  }, [isSuper]);

  useEffect(() => {
    const key = storageKeyFor(isSuper);
    const evt = eventNameFor(isSuper);
    function onStorage(e: StorageEvent) {
      if (e.key === key) setPinnedSecondary(e.newValue === '1');
    }
    function onCustom() {
      setPinnedSecondary(readPinned(isSuper));
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener(evt, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(evt, onCustom);
    };
  }, [isSuper]);

  if (expectedRole === 'admin' && isSuper) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  const roleLabel =
    session?.staffRole?.name ?? (isSuper ? 'Super admin' : 'Admin');

  function setPinned(next: boolean) {
    setPinnedSecondary(next);
    window.localStorage.setItem(storageKeyFor(isSuper), next ? '1' : '0');
    window.dispatchEvent(new Event(eventNameFor(isSuper)));
  }

  function onToggleSecondary() {
    if (pinnedSecondary) {
      setPinned(false);
      return;
    }
    // Show or Pin both persist the preference.
    setPinned(true);
  }

  const toggleLabel = secondaryToggleLabel({
    isSuper,
    pinned: pinnedSecondary,
    onSecondaryPath,
  });

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel={isSuper ? 'Super admin' : 'Admin'}
      homeTo={`${base}/dashboard`}
      profileTo={`${base}/profile`}
      nav={nav}
      headerExtra={<LocalePickers />}
      sidebarNavExtra={
        hasSecondary ? (
          <button
            type="button"
            className="hb-dashboard__nav-link w-full text-left"
            onClick={onToggleSecondary}
            aria-pressed={pinnedSecondary}
          >
            <span className="hb-dashboard__nav-label text-[var(--hb-dash-muted)]">
              {toggleLabel}
            </span>
          </button>
        ) : null
      }
      userLabel={session?.user.email ?? null}
      userRoleLabel={roleLabel}
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      storageKey={isSuper ? 'hb-dash-collapsed-super' : 'hb-dash-collapsed-admin'}
      footerNote={`© ${new Date().getFullYear()} Halal Basket. All rights reserved.`}
    />
  );
}
