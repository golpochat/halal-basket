import { useEffect, useRef } from 'react';
import { formatUserFacingError, toastError, toastSuccess } from '@halal-basket/web';

/**
 * Bridges legacy setError/setMsg state into the shared toast viewport.
 * Renders nothing — messages appear as toasts across admin dashboards.
 */
export function Flash({ error, msg }: { error?: string; msg?: string }) {
  const lastError = useRef<string | undefined>(undefined);
  const lastMsg = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!error) {
      lastError.current = undefined;
      return;
    }
    if (error === lastError.current) return;
    lastError.current = error;
    toastError(formatUserFacingError(error));
  }, [error]);

  useEffect(() => {
    if (!msg) {
      lastMsg.current = undefined;
      return;
    }
    if (msg === lastMsg.current) return;
    lastMsg.current = msg;
    toastSuccess(msg);
  }, [msg]);

  return null;
}
