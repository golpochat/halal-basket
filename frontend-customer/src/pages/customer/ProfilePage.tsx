import { ProfileEditor, useDashboardTitle } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function CustomerProfilePage() {
  const { t } = useLocale();
  useDashboardTitle(t('profile.title'));
  const { session, setSession } = useAuth();
  if (!session) return null;

  return (
    <ProfileEditor
      apiBaseUrl={API_URL}
      accessToken={session.accessToken}
      onSessionUpdate={(next) => setSession(next)}
      t={t}
    />
  );
}
