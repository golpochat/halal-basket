import { useEffect } from 'react';

/** Legacy customer-app admin paths → dedicated admin app. */
export function RedirectToAdminApp() {
  useEffect(() => {
    const path = window.location.pathname;
    const base = (
      import.meta.env.VITE_ADMIN_URL ?? 'http://localhost:5176'
    ).replace(/\/$/, '');
    const suffix = path.startsWith('/super-admin')
      ? '/super-admin/dashboard'
      : '/admin/dashboard';
    window.location.replace(`${base}${suffix}`);
  }, []);
  return (
    <p className="p-8 text-center text-sm text-[var(--hb-ink)]/55">
      Redirecting to admin portal…
    </p>
  );
}
