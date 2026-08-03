import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

/** Product ids currently favourited by the signed-in customer. */
export function useFavourites() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const isCustomer = session?.user.role === 'customer';
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !isCustomer) {
      setIds(new Set());
      setReady(true);
      return;
    }
    try {
      const res = await api<{ productIds: string[] }>(
        '/customers/me/favourites/ids',
        { token },
      );
      setIds(new Set(res.productIds));
    } catch {
      setIds(new Set());
    } finally {
      setReady(true);
    }
  }, [token, isCustomer]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!token || !isCustomer) return;
      const favourited = ids.has(productId);
      // Optimistic
      setIds((prev) => {
        const next = new Set(prev);
        if (favourited) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        const res = favourited
          ? await api<{ productIds: string[] }>(
              `/customers/me/favourites/${productId}`,
              { method: 'DELETE', token },
            )
          : await api<{ productIds: string[] }>('/customers/me/favourites', {
              method: 'POST',
              token,
              body: JSON.stringify({ productId }),
            });
        setIds(new Set(res.productIds));
      } catch {
        await refresh();
        throw new Error(
          favourited
            ? 'Could not remove favourite'
            : 'Could not save favourite',
        );
      }
    },
    [token, isCustomer, ids, refresh],
  );

  return {
    enabled: Boolean(token && isCustomer),
    ready,
    ids,
    isFavourite: (productId: string) => ids.has(productId),
    toggle,
    refresh,
  };
}
