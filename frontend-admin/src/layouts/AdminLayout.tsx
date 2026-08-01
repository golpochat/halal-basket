import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';

function navForBase(base: string, isSuper: boolean): DashboardNavItem[] {
  const superOnly: DashboardNavItem[] = isSuper
    ? [
        { to: `${base}/analytics`, label: 'Analytics', icon: 'chart' },
        { to: `${base}/branding`, label: 'Branding', icon: 'spark' },
        { to: `${base}/warehouse`, label: 'Warehouse', icon: 'building' },
        { to: `${base}/delivery-fees`, label: 'Delivery fees', icon: 'tag' },
        { to: `${base}/promotions`, label: 'Promotions', icon: 'tag' },
        { to: `${base}/delivery-calendar`, label: 'Calendar', icon: 'calendar' },
        { to: `${base}/featured`, label: 'Popular', icon: 'grid' },
        { to: `${base}/currencies`, label: 'Currencies', icon: 'globe' },
        { to: `${base}/languages`, label: 'Languages', icon: 'globe' },
        { to: `${base}/shops`, label: 'Shops', icon: 'store' },
        { to: `${base}/users`, label: 'Users', icon: 'users' },
        { to: `${base}/catalogue`, label: 'Catalogue', icon: 'package' },
        { to: `${base}/gdpr`, label: 'Privacy', icon: 'shield' },
        { to: `${base}/ops-drill`, label: 'Ops drill', icon: 'settings' },
      ]
    : [];

  return [
    { to: `${base}/dashboard`, label: 'Dashboard', end: true, icon: 'home' },
    { to: `${base}/ops`, label: 'Ops', icon: 'list' },
    ...superOnly,
  ];
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
  const role = session?.user.role;
  const isSuper = role === 'super_admin';

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-role',
      isSuper ? 'super_admin' : 'admin',
    );
  }, [isSuper]);

  if (expectedRole === 'admin' && isSuper) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel={isSuper ? 'Super admin' : 'Admin'}
      homeTo={`${base}/dashboard`}
      profileTo={`${base}/profile`}
      nav={navForBase(base, isSuper)}
      userLabel={session?.user.email ?? null}
      userRoleLabel={isSuper ? 'Super admin' : 'Admin'}
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      storageKey={isSuper ? 'hb-dash-collapsed-super' : 'hb-dash-collapsed-admin'}
      footerNote={`© ${new Date().getFullYear()} Halal Basket. All rights reserved.`}
    />
  );
}
