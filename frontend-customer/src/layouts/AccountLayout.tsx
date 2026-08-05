import { useEffect, useMemo } from 'react';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { LocalePickers } from '../components/LocalePickers';
import { useLocale } from '../locale/LocaleContext';

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
  const { t } = useLocale();
  const year = new Date().getFullYear();

  const accountNav: DashboardNavItem[] = useMemo(
    () => [
      {
        to: '/customer/dashboard',
        label: t('nav.dashboard'),
        end: true,
        icon: 'home',
      },
      { to: '/customer/orders', label: t('nav.orders'), icon: 'package' },
      {
        to: '/customer/favourites',
        label: t('nav.favourites'),
        icon: 'heart',
      },
      {
        to: '/customer/addresses',
        label: t('nav.addresses'),
        icon: 'location',
      },
      { to: '/customer/profile', label: t('nav.profile'), icon: 'account' },
      { to: '/', label: t('nav.backToShop'), icon: 'store' },
    ],
    [t],
  );

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
      brandLabel={t('nav.customer')}
      homeTo="/customer/dashboard"
      profileTo="/customer/profile"
      nav={accountNav}
      headerExtra={<LocalePickers />}
      userLabel={session?.user.email ?? null}
      userRoleLabel={t('nav.customer')}
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      storageKey="hb-dash-collapsed-customer"
      footerNote={t('nav.rightsReserved', { year })}
      signOutLabel={t('chrome.signOut')}
      myProfileLabel={t('nav.myProfile')}
    />
  );
}
