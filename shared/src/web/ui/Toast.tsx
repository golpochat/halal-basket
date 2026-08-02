import { createPortal } from 'react-dom';
import { useToastStore } from '../store/toast-store';

export function ToastViewport() {
  const items = useToastStore((s) => s.items);

  if (typeof document === 'undefined') return null;

  return createPortal(
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
    </div>,
    document.body,
  );
}
