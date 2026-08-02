import { useEffect, useRef, useState } from 'react';

export type OrderLiveSnapshot = {
  id: string;
  status: string;
  paymentStatus?: string;
  fulfillmentMode: string;
  updatedAt?: string;
  polledAt?: string;
  fulfillmentCount?: number;
  splitOrder?: boolean;
  fulfillments: Array<{
    id: string;
    part?: number;
    partsTotal?: number;
    shopId: string;
    shopName?: string;
    shopAddress?: string | null;
    status: string;
    deliveryDate: string | null;
    estimatedDeliveryAt: string | null;
  }>;
};

export type OrderLiveConnection =
  | 'connecting'
  | 'live'
  | 'polling'
  | 'paused'
  | 'error';

type UseOrderLiveOptions = {
  orderId: string | null | undefined;
  token: string | null | undefined;
  baseUrl: string;
  enabled?: boolean;
};

function parseSseChunk(
  chunk: string,
  onEvent: (event: string, data: string) => void,
): string {
  const parts = chunk.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const block of parts) {
    if (!block.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length > 0) {
      onEvent(event, dataLines.join('\n'));
    }
  }
  return rest;
}

async function readSseStream(
  res: Response,
  onEvent: (event: string, data: unknown) => void,
  signal: AbortSignal,
) {
  if (!res.body) throw new Error('No response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = parseSseChunk(buffer, (event, raw) => {
      try {
        onEvent(event, JSON.parse(raw));
      } catch {
        onEvent(event, raw);
      }
    });
  }
}

/**
 * Subscribe to order live status via SSE (Bearer auth).
 * Falls back to short polling if the stream cannot stay open.
 */
export function useOrderLive({
  orderId,
  token,
  baseUrl,
  enabled = true,
}: UseOrderLiveOptions) {
  const [snapshot, setSnapshot] = useState<OrderLiveSnapshot | null>(null);
  const [connection, setConnection] =
    useState<OrderLiveConnection>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!enabled || !orderId || !token) {
      setConnection('paused');
      return;
    }

    let cancelled = false;
    let abort: AbortController | null = null;
    let pollTimer: number | undefined;
    let reconnectTimer: number | undefined;

    const applySnapshot = (snap: OrderLiveSnapshot) => {
      if (cancelled) return;
      setSnapshot(snap);
      setLastEventAt(snap.polledAt ?? new Date().toISOString());
    };

    const stopPoll = () => {
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = undefined;
      }
    };

    const pollOnce = async () => {
      try {
        const res = await fetch(`${baseUrl}/orders/${orderId}/live`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`live ${res.status}`);
        const snap = (await res.json()) as OrderLiveSnapshot;
        applySnapshot(snap);
        if (!cancelled) setConnection('polling');
      } catch {
        if (!cancelled) setConnection('error');
      }
    };

    const startPoll = () => {
      stopPoll();
      void pollOnce();
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void pollOnce();
      }, 5000);
    };

    const connectStream = async () => {
      if (cancelled) return;
      stopPoll();
      abort?.abort();
      abort = new AbortController();
      setConnection('connecting');

      try {
        const res = await fetch(`${baseUrl}/orders/${orderId}/live/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: abort.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`stream ${res.status}`);
        }

        failuresRef.current = 0;
        if (!cancelled) setConnection('live');

        await readSseStream(
          res,
          (event, data) => {
            if (event === 'ping' || event === 'message') {
              // Nest may omit event name; status payloads have fulfillments
              if (
                data &&
                typeof data === 'object' &&
                'fulfillments' in (data as object)
              ) {
                applySnapshot(data as OrderLiveSnapshot);
                if (!cancelled) setConnection('live');
              }
              return;
            }
            if (event === 'status' && data && typeof data === 'object') {
              applySnapshot(data as OrderLiveSnapshot);
              if (!cancelled) setConnection('live');
            }
          },
          abort.signal,
        );

        if (!cancelled) {
          failuresRef.current += 1;
          scheduleReconnect();
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        failuresRef.current += 1;
        if (failuresRef.current >= 3) {
          startPoll();
        } else {
          scheduleReconnect();
        }
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(1000 * 2 ** (failuresRef.current - 1), 15_000);
      setConnection(failuresRef.current >= 3 ? 'polling' : 'connecting');
      reconnectTimer = window.setTimeout(() => {
        if (document.visibilityState === 'hidden') return;
        if (failuresRef.current >= 3) startPoll();
        else void connectStream();
      }, delay);
    };

    const onVis = () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden') {
        abort?.abort();
        stopPoll();
        if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
        setConnection('paused');
        return;
      }
      failuresRef.current = 0;
      void connectStream();
    };

    void connectStream();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      abort?.abort();
      stopPoll();
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [orderId, token, baseUrl, enabled]);

  return { snapshot, connection, lastEventAt };
}
