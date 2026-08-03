import { Navigate, useLocation } from 'react-router-dom';
import { isExternalHome } from '@halal-basket/web';
import { homeForRole } from '../lib/api';
import { useAuthStore } from './auth-store';

function redirectHome(role: string) {
  const dest = homeForRole(role);
  if (isExternalHome(dest)) {
    window.location.replace(dest);
    return null;
  }
  return <Navigate to={dest} replace />;
}

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
    return redirectHome(session.user.role);
  }
  return children;
}

/** Super admin always passes. Admin needs every listed permission key. */
export function RequirePermission({
  permissions,
  children,
}: {
  permissions: string[];
  children: React.ReactNode;
}) {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role === 'super_admin') return children;
  const have = new Set(session.permissions ?? []);
  if (permissions.every((p) => have.has(p))) return children;
  return redirectHome(session.user.role);
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  if (session) {
    return redirectHome(session.user.role);
  }
  return children;
}
