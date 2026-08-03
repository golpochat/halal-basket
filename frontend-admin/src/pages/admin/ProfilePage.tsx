import { ProfileEditor, useDashboardTitle } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function AdminProfilePage() {
  useDashboardTitle('Profile');
  const { session, setSession } = useAuth();
  if (!session) return null;

  return (
    <ProfileEditor
      apiBaseUrl={API_URL}
      accessToken={session.accessToken}
      onSessionUpdate={(next) =>
        setSession({
          ...session,
          accessToken: next.accessToken,
          user: next.user,
          permissions:
            'permissions' in next && Array.isArray(next.permissions)
              ? next.permissions
              : session.permissions,
          staffRole:
            'staffRole' in next
              ? (next.staffRole as typeof session.staffRole)
              : session.staffRole,
        })
      }
    />
  );
}
