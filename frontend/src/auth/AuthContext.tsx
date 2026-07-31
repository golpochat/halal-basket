import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AuthSession,
  clearSession,
  loadSession,
  saveSession,
} from '../lib/api';

type AuthContextValue = {
  session: AuthSession | null;
  setSession: (s: AuthSession | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() =>
    loadSession(),
  );

  const setSession = useCallback((s: AuthSession | null) => {
    if (s) saveSession(s);
    else clearSession();
    setSessionState(s);
  }, []);

  const logout = useCallback(() => setSession(null), [setSession]);

  const value = useMemo(
    () => ({ session, setSession, logout }),
    [session, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}
