import {
  createApiClient,
  homeForRole as homeForRoleBase,
  isExternalHome,
  authHandoffUrl,
  type AppUrls,
  type AuthSession,
  type AuthUser,
  type UserRole,
} from '@halal-basket/web';

export type { AuthSession, AuthUser, UserRole };
export { isExternalHome, authHandoffUrl };

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = createApiClient(API_URL);

export function appUrls(): AppUrls {
  return {
    customer: import.meta.env.VITE_CUSTOMER_URL,
    shop: import.meta.env.VITE_SHOP_URL,
    driver: import.meta.env.VITE_DRIVER_URL,
    admin: import.meta.env.VITE_ADMIN_URL,
  };
}

export function homeForRole(role: string) {
  return homeForRoleBase(role, 'customer', appUrls());
}
