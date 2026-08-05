import {
  AccountMenu,
  isExternalHome,
  type AccountMenuItem,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { homeForRole } from '../../lib/api';

/** Avatar account menu — shared look with all role dashboards. */
export function ProfileMenu() {
  const { session, logout } = useAuth();
  const { t } = useLocale();
  if (!session) return null;

  const role = session.user.role;
  const items: AccountMenuItem[] = [];

  if (role === 'customer') {
    items.push(
      {
        key: 'dashboard',
        label: t('nav.dashboard'),
        to: '/customer/dashboard',
        icon: 'home',
      },
      {
        key: 'profile',
        label: t('nav.myProfile'),
        to: '/customer/profile',
        icon: 'account',
      },
      {
        key: 'addresses',
        label: t('nav.addresses'),
        to: '/customer/addresses',
        icon: 'home',
      },
      {
        key: 'orders',
        label: t('nav.orders'),
        to: '/customer/orders',
        icon: 'package',
      },
      {
        key: 'favourites',
        label: t('nav.favourites'),
        to: '/customer/favourites',
        icon: 'heart',
      },
    );
  } else {
    const dest = homeForRole(role);
    const label =
      role === 'shop'
        ? t('nav.shop')
        : role === 'driver'
          ? t('nav.driver')
          : t('nav.admin');
    items.push({
      key: 'home',
      label,
      ...(isExternalHome(dest) ? { href: dest } : { to: dest }),
      icon: 'home',
    });
  }

  return (
    <AccountMenu
      email={session.user.email}
      roleLabel={role.replaceAll('_', ' ')}
      avatarUrl={session.user.avatarUrl}
      items={items}
      onLogout={logout}
      portal
      triggerClassName="hb-profile-trigger"
      signOutLabel={t('chrome.signOut')}
      accountLabel={t('chrome.account')}
      accountMenuAriaLabel={t('chrome.accountMenu')}
      closeMenuAriaLabel={t('chrome.closeAccountMenu')}
      myProfileLabel={t('nav.myProfile')}
    />
  );
}
