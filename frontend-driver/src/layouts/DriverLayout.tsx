import { useEffect } from 'react';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';

const driverNav: DashboardNavItem[] = [
  { to: '/driver/dashboard', label: 'Dashboard', end: true, icon: 'truck' },
  { to: '/driver/history', label: 'History', icon: 'list' },
];

export function DriverLayout() {
  return (
    <RequireAuth>
      <RequireRole roles={['driver']}>
        <DriverShell />
      </RequireRole>
    </RequireAuth>
  );
}

function DriverShell() {
  const { session, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-role', 'driver');
  }, []);

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel="Driver"
      homeTo="/driver/dashboard"
      profileTo="/driver/profile"
      nav={driverNav}
      userLabel={session?.user.email ?? null}
      userRoleLabel="Driver"
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      compact
      storageKey="hb-dash-collapsed-driver"
      footerNote={`© ${new Date().getFullYear()} Halal Basket. All rights reserved.`}
    />
  );
}
