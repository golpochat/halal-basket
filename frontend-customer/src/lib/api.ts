import {
  createApiClient,
  homeForRole,
  type AuthSession,
  type AuthUser,
  type UserRole,
} from '@halal-basket/web';

export type { AuthSession, AuthUser, UserRole };
export { homeForRole };

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = createApiClient(API_URL);
