export * from './types';
export * from './api/client';
export * from './api/hooks';
export * from './store/auth-store';
export * from './store/cart-store';
export * from './store/catalogue-store';
export * from './store/toast-store';
export * from './catalogue/taxonomy';
export * from './catalogue/category-icons';
export * from './catalogue/cart-availability';
export * from './icons';
export * from './ui/Button';
export * from './ui/Input';
export * from './ui/Badge';
export * from './ui/Modal';
export * from './ui/Toast';
export * from './ui/Feedback';
export * from './ui/ProductCard';
export * from './ui/ProductImage';
export * from './ui/DashboardShell';
export * from './ui/ProfileEditor';
export * from './ui/UserAvatar';
export * from './ui/AccountMenu';

export type AppId = 'customer' | 'shop' | 'driver' | 'admin';

export type AppUrls = Partial<Record<AppId, string>>;

/** True when homeForRole returned an absolute cross-app URL. */
export function isExternalHome(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function joinAppUrl(base: string | undefined, path: string): string | null {
  if (!base) return null;
  const root = base.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${root}${suffix === '/' ? '/' : suffix}`;
}

function homePathForRole(role: string): { app: AppId; path: string } {
  switch (role) {
    case 'shop':
      return { app: 'shop', path: '/shop/dashboard' };
    case 'driver':
      return { app: 'driver', path: '/driver/dashboard' };
    case 'admin':
      return { app: 'admin', path: '/admin/dashboard' };
    case 'super_admin':
      return { app: 'admin', path: '/super-admin/dashboard' };
    case 'customer':
    default:
      return { app: 'customer', path: '/customer/dashboard' };
  }
}

/**
 * In-app path or absolute URL for the role’s home.
 * When `urls` includes the target app and it differs from the current `app`,
 * returns an absolute URL so login can hand off across Vite ports.
 */
export function homeForRole(
  role: string,
  app: AppId = 'customer',
  urls?: AppUrls,
): string {
  const target = homePathForRole(role);

  if (app === target.app) {
    return target.path;
  }

  const external = joinAppUrl(urls?.[target.app], target.path);
  if (external) return external;

  if (app === 'shop') return role === 'shop' ? '/shop/dashboard' : '/login';
  if (app === 'driver') return role === 'driver' ? '/driver/dashboard' : '/login';
  if (app === 'admin') {
    if (role === 'super_admin') return '/super-admin/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/login';
  }
  if (role === 'customer') return '/customer/dashboard';
  return target.path;
}

const HANDOFF_HASH_PREFIX = '#hb_auth=';

/** Build absolute URL that carries a one-shot session handoff in the hash. */
export function authHandoffUrl(
  targetHomeUrl: string,
  session: import('./types').AuthSession,
): string {
  const url = new URL(
    targetHomeUrl.startsWith('http')
      ? targetHomeUrl
      : `http://local.invalid${targetHomeUrl.startsWith('/') ? '' : '/'}${targetHomeUrl}`,
  );
  const payload = encodeURIComponent(JSON.stringify(session));
  url.hash = `hb_auth=${payload}`;
  if (targetHomeUrl.startsWith('http')) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * If the location hash contains an auth handoff, parse it, clear the hash, and return the session.
 */
export function consumeAuthHandoff(
  hash = typeof window !== 'undefined' ? window.location.hash : '',
): import('./types').AuthSession | null {
  if (!hash.startsWith(HANDOFF_HASH_PREFIX)) return null;
  try {
    const raw = decodeURIComponent(hash.slice(HANDOFF_HASH_PREFIX.length));
    const session = JSON.parse(raw) as import('./types').AuthSession;
    if (!session?.accessToken || !session?.user?.role) return null;
    if (typeof window !== 'undefined') {
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', `${pathname}${search}`);
    }
    return session;
  } catch {
    return null;
  }
}

export function deriveStockLevel(
  isInStock: boolean,
  lowThresholdHint = false,
): import('./types').StockLevel {
  if (!isInStock) return 'out_of_stock';
  if (lowThresholdHint) return 'low_stock';
  return 'in_stock';
}
