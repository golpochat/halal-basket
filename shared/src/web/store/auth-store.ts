import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '../types';

type AuthState = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  logout: () => void;
};

export function createAuthStore(storageKey: string) {
  return create<AuthState>()(
    persist(
      (set) => ({
        session: null,
        setSession: (session) => set({ session }),
        logout: () => set({ session: null }),
      }),
      { name: storageKey },
    ),
  );
}
