export * from './types';
export * from './api/client';
export * from './api/hooks';
export * from './store/auth-store';
export * from './store/cart-store';
export * from './store/catalogue-store';
export * from './store/toast-store';
export * from './catalogue/taxonomy';
export * from './catalogue/category-icons';
export * from './icons';
export * from './ui/Button';
export * from './ui/Input';
export * from './ui/Badge';
export * from './ui/Modal';
export * from './ui/Toast';
export * from './ui/Feedback';
export * from './ui/ProductCard';
export * from './ui/ProductImage';

export function homeForRole(
  role: string,
  app: 'customer' | 'shop' | 'driver' = 'customer',
): string {
  if (app === 'shop') return role === 'shop' ? '/' : '/login';
  if (app === 'driver') return role === 'driver' ? '/' : '/login';
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    default:
      return '/';
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
