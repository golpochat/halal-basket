import { Navigate, useLocation } from 'react-router-dom';
import { homeForRole } from '../lib/api';
import { useAuthStore } from './auth-store';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (!roles.includes(session.user.role)) {
    return <Navigate to={homeForRole(session.user.role)} replace />;
  }
  return children;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  if (session) {
    return <Navigate to={homeForRole(session.user.role)} replace />;
  }
  return children;
}
