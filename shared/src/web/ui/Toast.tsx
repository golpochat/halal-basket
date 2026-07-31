import { useToastStore } from '../store/toast-store';

export function ToastViewport() {
  const items = useToastStore((s) => s.items);

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2 sm:bottom-6"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-[var(--hb-radius)] px-4 py-3 text-center text-sm font-medium shadow-[var(--hb-shadow-lg)] ${
            t.tone === 'error'
              ? 'bg-[var(--hb-error)] text-white'
              : 'bg-[var(--hb-ink)] text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
