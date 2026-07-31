import {
  createApiClient,
  homeForRole as homeForRoleBase,
  type AuthSession,
  type AuthUser,
} from '@halal-basket/web';

export type { AuthSession, AuthUser };

export const api = createApiClient(
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
);

export function homeForRole(role: string) {
  return homeForRoleBase(role, 'shop');
}
