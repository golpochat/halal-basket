import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toastSuccess, toastError } from '@halal-basket/web';
import { useCatalogueStore } from '@halal-basket/web';
import { useAuth } from '../auth/AuthContext';
import { api, type AuthSession } from '../lib/api';

type AssistRedeem = {
  ok: true;
  threadId: string;
  customerId: string | null;
  message: string;
  session: AuthSession | null;
};

/**
 * Handles `?wa_assist=` deep links from WhatsApp Phase C.
 * Validates token, optionally signs the customer in, strips the query, toasts.
 */
export function useWhatsappAssistHandoff() {
  const [params, setParams] = useSearchParams();
  const { setSession } = useAuth();
  const setViewMode = useCatalogueStore((s) => s.setViewMode);
  const ran = useRef<string | null>(null);

  useEffect(() => {
    const token = params.get('wa_assist')?.trim();
    if (!token) return;
    if (ran.current === token) return;
    ran.current = token;
    // Fresh WhatsApp handoff: force a nicer catalogue layout.
    setViewMode('grid');

    void (async () => {
      try {
        const result = await api<AssistRedeem>(
          `/whatsapp/assist/${encodeURIComponent(token)}`,
        );
        if (result.session) {
          setSession(result.session);
        }
        toastSuccess(result.message || 'Continue your WhatsApp order');
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : 'Assist link invalid or expired',
        );
      } finally {
        const next = new URLSearchParams(params);
        next.delete('wa_assist');
        setParams(next, { replace: true });
      }
    })();
  }, [params, setParams, setSession]);
}
