import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="hb-modal-title"
        className="relative z-10 w-full max-w-lg rounded-t-[var(--hb-radius-xl)] bg-[var(--hb-cream)] shadow-[var(--hb-shadow-lg)] sm:rounded-[var(--hb-radius-xl)]"
      >
        <div className="flex items-center justify-between border-b border-[rgba(26,92,58,0.1)] px-5 py-4">
          <h2
            id="hb-modal-title"
            className="font-display text-xl font-semibold"
          >
            {title}
          </h2>
          <Button variant="tertiary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-[rgba(26,92,58,0.1)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
