import { useAuthStore } from './auth-store';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  return { session, setSession, logout };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}
