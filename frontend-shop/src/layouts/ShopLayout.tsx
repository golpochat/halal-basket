import { useEffect } from 'react';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';

const shopNav: DashboardNavItem[] = [
  { to: '/shop/dashboard', label: 'Dashboard', end: true, icon: 'home' },
  { to: '/shop/orders', label: 'Orders', icon: 'package' },
  { to: '/shop/prep', label: 'Scheduled prep', icon: 'calendar' },
  { to: '/shop/products', label: 'Products', icon: 'tag' },
];

export function ShopLayout() {
  return (
    <RequireAuth>
      <RequireRole roles={['shop']}>
        <ShopShell />
      </RequireRole>
    </RequireAuth>
  );
}

function ShopShell() {
  const { session, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-role', 'shop');
  }, []);

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel="Shop"
      homeTo="/shop/dashboard"
      profileTo="/shop/profile"
      nav={shopNav}
      userLabel={session?.user.email ?? null}
      userRoleLabel="Shop"
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      storageKey="hb-dash-collapsed-shop"
      footerNote={`© ${new Date().getFullYear()} Halal Basket. All rights reserved.`}
    />
  );
}
