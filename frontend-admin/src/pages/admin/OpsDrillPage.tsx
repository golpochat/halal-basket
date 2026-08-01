import { useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

export function AdminOpsDrillPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <OpsDrillInner />
      </RequireRole>
    </RequireAuth>
  );
}

function OpsDrillInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Ops drill</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Ops drill</h2>
          <button
            type="button"
            className="hb-btn hb-btn-primary mt-3"
            onClick={async () => {
              setError('');
              setMsg('');
              try {
                await api('/admin/ops/test-alert', {
                  method: 'POST',
                  token,
                  body: JSON.stringify({ reason: 'ui-drill' }),
                });
                setMsg('Test alert fired');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fire alert');
              }
            }}
          >
            Fire test alert
          </button>
        </section>
      </div>
    </>
  );
}
