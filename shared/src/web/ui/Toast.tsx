import { useToastStore } from '../store/toast-store';

export function ToastViewport() {
  const items = useToastStore((s) => s.items);

  return (
    <div className="hb-toast-viewport" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`hb-toast ${t.tone === 'error' ? 'hb-toast--error' : 'hb-toast--default'}`}
          role={t.tone === 'error' ? 'alert' : 'status'}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
