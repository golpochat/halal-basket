import { useEffect, type ReactNode } from 'react';

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
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
        className="relative z-10 w-full max-w-lg rounded-t-2xl bg-[var(--hb-cream)] shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[rgba(26,92,58,0.1)] px-5 py-4">
          <h2 id="hb-modal-title" className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="hb-btn hb-btn-ghost px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
