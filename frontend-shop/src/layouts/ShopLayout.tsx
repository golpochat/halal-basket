import { useEffect, useMemo } from 'react';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { LocalePickers } from '../components/LocalePickers';
import { useLocale } from '../locale/LocaleContext';

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
  const { t } = useLocale();
  const year = new Date().getFullYear();

  const shopNav: DashboardNavItem[] = useMemo(
    () => [
      {
        to: '/shop/dashboard',
        label: t('nav.dashboard'),
        end: true,
        icon: 'home',
      },
      { to: '/shop/orders', label: 'Orders', icon: 'package' },
      { to: '/shop/prep', label: 'Scheduled prep', icon: 'calendar' },
      { to: '/shop/products', label: 'Products', icon: 'tag' },
    ],
    [t],
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-role', 'shop');
  }, []);

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel={t('nav.shop')}
      homeTo="/shop/dashboard"
      profileTo="/shop/profile"
      nav={shopNav}
      headerExtra={<LocalePickers />}
      userLabel={session?.user.email ?? null}
      userRoleLabel={t('nav.shop')}
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      storageKey="hb-dash-collapsed-shop"
      footerNote={t('nav.rightsReserved', { year })}
      signOutLabel={t('chrome.signOut')}
      myProfileLabel={t('nav.myProfile')}
    />
  );
}
