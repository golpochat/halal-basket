import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

export function AdminBrandingPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <BrandingInner />
      </RequireRole>
    </RequireAuth>
  );
}

function BrandingInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [heroBg, setHeroBg] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ heroBackgroundUrl: string | null }>('/platform/branding')
      .then((b) => setHeroBg(b.heroBackgroundUrl ?? ''))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Branding</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-semibold">Customer landing hero</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Background image URL shown behind the homepage headline and search.
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setMsg('');
              try {
                await api('/admin/platform/branding', {
                  method: 'PATCH',
                  token,
                  body: JSON.stringify({ heroBackgroundUrl: heroBg }),
                });
                setMsg('Hero background saved');
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Failed to save branding',
                );
              }
            }}
          >
            <input
              className="hb-input flex-1"
              placeholder="https://…/hero.jpg"
              value={heroBg}
              onChange={(e) => setHeroBg(e.target.value)}
              aria-label="Hero background image URL"
            />
            <button type="submit" className="hb-btn hb-btn-primary px-4 py-2 text-sm">
              Save
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
