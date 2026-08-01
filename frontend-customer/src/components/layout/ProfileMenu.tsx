import {
  AccountMenu,
  isExternalHome,
  type AccountMenuItem,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { homeForRole } from '../../lib/api';

/** Avatar account menu — shared look with all role dashboards. */
export function ProfileMenu() {
  const { session, logout } = useAuth();
  if (!session) return null;

  const role = session.user.role;
  const items: AccountMenuItem[] = [];

  if (role === 'customer') {
    items.push(
      {
        key: 'dashboard',
        label: 'Dashboard',
        to: '/customer/dashboard',
        icon: 'home',
      },
      {
        key: 'profile',
        label: 'My Profile',
        to: '/customer/profile',
        icon: 'account',
      },
      {
        key: 'orders',
        label: 'My orders',
        to: '/customer/orders',
        icon: 'package',
      },
    );
  } else {
    const dest = homeForRole(role);
    const label =
      role === 'shop' ? 'Shop' : role === 'driver' ? 'Driver' : 'Admin';
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
    />
  );
}
