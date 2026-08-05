import { useEffect, useMemo } from 'react';
import { DashboardShell, type DashboardNavItem } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../auth/guards';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { LocalePickers } from '../components/LocalePickers';
import { useLocale } from '../locale/LocaleContext';

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
  const { t } = useLocale();
  const year = new Date().getFullYear();

  const driverNav: DashboardNavItem[] = useMemo(
    () => [
      {
        to: '/driver/dashboard',
        label: t('nav.openDeliveries'),
        end: true,
        icon: 'truck',
      },
      { to: '/driver/history', label: t('nav.history'), icon: 'list' },
    ],
    [t],
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-role', 'driver');
  }, []);

  return (
    <DashboardShell
      brand={<BrandLogo size="sm" />}
      brandCollapsed={<BrandLogo size="sm" showWordmark={false} />}
      brandLabel={t('nav.driver')}
      homeTo="/driver/dashboard"
      profileTo="/driver/profile"
      nav={driverNav}
      headerExtra={<LocalePickers />}
      userLabel={session?.user.email ?? null}
      userRoleLabel={t('nav.driver')}
      avatarUrl={session?.user.avatarUrl}
      onLogout={logout}
      compact
      storageKey="hb-dash-collapsed-driver"
      footerNote={t('nav.rightsReserved', { year })}
      signOutLabel={t('chrome.signOut')}
      myProfileLabel={t('nav.myProfile')}
    />
  );
}
