import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: string;
  children: ReactElement;
  side?: Side;
  delayMs?: number;
  disabled?: boolean;
  /** Stretch wrapper to fill parent (nav links). */
  block?: boolean;
};

type Pos = { top: number; left: number; side: Side };

function place(r: DOMRect, preferred: Side): Pos {
  const gap = 8;
  const midY = r.top + r.height / 2;
  const midX = r.left + r.width / 2;

  const candidates: Record<Side, Pos> = {
    top: { top: r.top - gap, left: midX, side: 'top' },
    bottom: { top: r.bottom + gap, left: midX, side: 'bottom' },
    left: { top: midY, left: r.left - gap, side: 'left' },
    right: { top: midY, left: r.right + gap, side: 'right' },
  };

  let side = preferred;
  if (preferred === 'top' && r.top < 40) side = 'bottom';
  else if (preferred === 'bottom' && window.innerHeight - r.bottom < 40)
    side = 'top';
  else if (preferred === 'left' && r.left < 120) side = 'right';
  else if (preferred === 'right' && window.innerWidth - r.right < 120)
    side = 'left';

  return candidates[side];
}

function tipTransform(side: Side): string {
  switch (side) {
    case 'top':
      return 'translate(-50%, -100%)';
    case 'bottom':
      return 'translate(-50%, 0)';
    case 'left':
      return 'translate(-100%, -50%)';
    case 'right':
      return 'translate(0, -50%)';
  }
}

/**
 * Platform tooltip — portaled, short delay, replaces native `title` chrome.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  delayMs = 350,
  disabled = false,
  block = false,
}: TooltipProps) {
  const tipId = useId();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  const show = useCallback(() => {
    if (disabled || !content.trim()) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs);
  }, [clearTimer, content, delayMs, disabled]);

  const updatePos = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setPos(place(el.getBoundingClientRect(), side));
  }, [side]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, updatePos]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  const tipStyle: CSSProperties | undefined = pos
    ? {
        top: pos.top,
        left: pos.left,
        transform: tipTransform(pos.side),
      }
    : undefined;

  return (
    <>
      <span
        ref={anchorRef}
        className={`hb-tooltip-anchor${block ? ' hb-tooltip-anchor--block' : ''}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open && tipStyle && typeof document !== 'undefined' && content.trim()
        ? createPortal(
            <span
              id={tipId}
              role="tooltip"
              className="hb-tooltip"
              style={tipStyle}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
