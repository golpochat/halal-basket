import { create } from 'zustand';

type ToastItem = { id: number; message: string; tone?: 'default' | 'error' };

type ToastState = {
  items: ToastItem[];
  toast: (message: string, tone?: ToastItem['tone']) => void;
  dismiss: (id: number) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  toast: (message, tone = 'default') => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { id, message, tone }] }));
    window.setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 2800);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
