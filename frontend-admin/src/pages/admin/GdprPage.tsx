import { useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

export function AdminGdprPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <GdprInner />
      </RequireRole>
    </RequireAuth>
  );
}

function GdprInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [eraseId, setEraseId] = useState('');

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-8 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">GDPR erase</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Permanently erase a customer by customer UUID (super-admin only).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="hb-input min-w-[16rem] flex-1"
              placeholder="Customer UUID"
              value={eraseId}
              onChange={(e) => setEraseId(e.target.value)}
            />
            <button
              type="button"
              className="hb-btn hb-btn-ghost"
              onClick={async () => {
                if (!eraseId.trim()) return;
                setError('');
                setMsg('');
                try {
                  await api(`/admin/customers/${eraseId}/erase`, {
                    method: 'POST',
                    token,
                  });
                  setMsg('Customer erased');
                  setEraseId('');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erase failed');
                }
              }}
            >
              Erase
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
