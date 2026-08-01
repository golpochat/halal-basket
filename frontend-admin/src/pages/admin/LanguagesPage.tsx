import { FormEvent, useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { LanguageRow } from './types';

export function AdminLanguagesPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <LanguagesInner />
      </RequireRole>
    </RequireAuth>
  );
}

function LanguagesInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [langCode, setLangCode] = useState('');
  const [langName, setLangName] = useState('');
  const [langNative, setLangNative] = useState('');
  const [langRtl, setLangRtl] = useState(false);

  async function refresh() {
    setLanguages(await api<LanguageRow[]>('/admin/languages', { token }));
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  async function addLanguage(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/admin/languages', {
        method: 'POST',
        token,
        body: JSON.stringify({
          code: langCode,
          name: langName,
          nativeName: langNative,
          isRtl: langRtl,
          isPublished: false,
        }),
      });
      setLangCode('');
      setLangName('');
      setLangNative('');
      setLangRtl(false);
      setMsg('Language added (unpublished)');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Language create failed');
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Languages</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-8 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Languages</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Default English stays published. Language picker shows only when 2+
            languages are published. Full UI translation packs can be added later;
            RTL is applied when selected.
          </p>
          <ul className="mt-4 space-y-2">
            {languages.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{l.nativeName}</strong> ({l.name} · {l.code})
                  {l.isRtl ? ' · RTL' : ''}
                  {l.isDefault ? ' · default' : ''}
                  {l.isPublished ? ' · published' : ' · unpublished'}
                </span>
                <span className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="hb-btn hb-btn-ghost px-2 py-1 text-xs"
                    disabled={l.isDefault && l.isPublished}
                    onClick={async () => {
                      setError('');
                      try {
                        await api(`/admin/languages/${l.id}/publish`, {
                          method: 'PATCH',
                          token,
                          body: JSON.stringify({ isPublished: !l.isPublished }),
                        });
                        setMsg(
                          l.isPublished
                            ? `${l.code} unpublished`
                            : `${l.code} published`,
                        );
                        await refresh();
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : 'Publish failed',
                        );
                      }
                    }}
                  >
                    {l.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  {!l.isDefault && (
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost px-2 py-1 text-xs"
                      onClick={async () => {
                        setError('');
                        try {
                          await api(`/admin/languages/${l.id}/set-default`, {
                            method: 'POST',
                            token,
                          });
                          setMsg(`${l.code} is now default`);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Set default failed',
                          );
                        }
                      }}
                    >
                      Make default
                    </button>
                  )}
                  {!l.isDefault && (
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost px-2 py-1 text-xs text-red-700"
                      onClick={async () => {
                        setError('');
                        try {
                          await api(`/admin/languages/${l.id}`, {
                            method: 'DELETE',
                            token,
                          });
                          setMsg(`${l.code} deleted`);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Delete failed',
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={addLanguage} className="mt-4 grid gap-2 sm:grid-cols-4">
            <input
              className="hb-input"
              placeholder="Code (bn)"
              value={langCode}
              onChange={(e) => setLangCode(e.target.value)}
              required
            />
            <input
              className="hb-input"
              placeholder="Name (Bangla)"
              value={langName}
              onChange={(e) => setLangName(e.target.value)}
              required
            />
            <input
              className="hb-input"
              placeholder="Native name"
              value={langNative}
              onChange={(e) => setLangNative(e.target.value)}
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={langRtl}
                onChange={(e) => setLangRtl(e.target.checked)}
              />
              RTL
            </label>
            <button className="hb-btn hb-btn-primary sm:col-span-4">
              Add language
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
