import { useEffect } from 'react';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';

const accountNav: DashboardNavItem[] = [
  { to: '/customer/dashboard', label: 'Dashboard', end: true, icon: 'home' },
  { to: '/customer/orders', label: 'My orders', icon: 'package' },
  { to: '/customer/favourites', label: 'Favourites', icon: 'heart' },
  { to: '/customer/addresses', label: 'Addresses', icon: 'location' },
  { to: '/customer/profile', label: 'Profile', icon: 'account' },
  { to: '/', label: 'Back to shop', icon: 'store' },
];

export function AccountLayout() {
  return (
    <RequireAuth>
      <RequireRole roles={['customer']}>
        <AccountShell />
      </RequireRole>
    </RequireAuth>
  );
}

function AccountShell() {
  const { session, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-role', 'customer');
    return () => {
      document.documentElement.removeAttribute('data-role');
    };
  }, []);

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel="Customer"
      homeTo="/customer/dashboard"
      profileTo="/customer/profile"
      nav={accountNav}
      userLabel={session?.user.email ?? null}
      userRoleLabel="Customer"
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      storageKey="hb-dash-collapsed-customer"
      footerNote={`© ${new Date().getFullYear()} Halal Basket. All rights reserved.`}
    />
  );
}
