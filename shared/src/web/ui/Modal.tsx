import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function useDashboardModalInset(open: boolean): number {
  const [insetLeft, setInsetLeft] = useState(0);

  useLayoutEffect(() => {
    if (!open) {
      setInsetLeft(0);
      return;
    }

    function measure() {
      const dashboard = document.querySelector('.hb-dashboard');
      const sidebar = document.querySelector('.hb-dashboard__sidebar');
      if (
        !dashboard ||
        !sidebar ||
        !window.matchMedia('(min-width: 640px)').matches
      ) {
        setInsetLeft(0);
        return;
      }
      setInsetLeft(Math.round(sidebar.getBoundingClientRect().width));
    }

    measure();
    window.addEventListener('resize', measure);
    const sidebar = document.querySelector('.hb-dashboard__sidebar');
    const observer =
      sidebar && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    if (sidebar && observer) observer.observe(sidebar);

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [open]);

  return insetLeft;
}

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
  const insetLeft = useDashboardModalInset(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-y-0 right-0 z-[120] flex items-center justify-center bg-black/35 p-4 max-sm:items-end max-sm:p-0"
      style={{ left: insetLeft }}
    >
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
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-[var(--hb-radius-xl)] bg-[var(--hb-cream)] shadow-[var(--hb-shadow-lg)] sm:rounded-[var(--hb-radius-xl)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[rgba(26,92,58,0.1)] px-5 py-4">
          <h2
            id="hb-modal-title"
            className="font-display text-xl font-semibold"
          >
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[rgba(26,92,58,0.1)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
