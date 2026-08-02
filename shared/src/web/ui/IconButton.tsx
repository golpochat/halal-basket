import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Tooltip } from './Tooltip';

type Tone = 'default' | 'primary' | 'danger';

const toneClass: Record<Tone, string> = {
  default: '',
  primary: 'hb-icon-btn--primary',
  danger: 'hb-icon-btn--danger',
};

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'title' | 'aria-label'
> & {
  /** Accessible name; also used as tooltip unless `tooltip` is set. */
  label: string;
  /** Optional tooltip override (defaults to `label`). */
  tooltip?: string;
  tone?: Tone;
  children: ReactNode;
};

/**
 * Icon action control with platform tooltip (no native `title` chrome).
 */
export function IconButton({
  label,
  tooltip,
  tone = 'default',
  className = '',
  type = 'button',
  children,
  disabled,
  ...props
}: IconButtonProps) {
  const tip = (tooltip ?? label).trim();

  const button = (
    <button
      type={type}
      className={`hb-icon-btn ${toneClass[tone]} ${className}`.trim()}
      aria-label={label}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );

  if (!tip) return button;

  return (
    <Tooltip content={tip} disabled={Boolean(disabled)}>
      {button}
    </Tooltip>
  );
}
