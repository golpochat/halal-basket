export function homeForRole(
  role: string,
  app: 'customer' | 'shop' | 'driver' = 'customer',
): string {
  if (app === 'shop') {
    return role === 'shop' ? '/' : '/login';
  }
  if (app === 'driver') {
    return role === 'driver' ? '/' : '/login';
  }
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    case 'customer':
      return '/catalogue';
    default:
      return '/catalogue';
  }
}
