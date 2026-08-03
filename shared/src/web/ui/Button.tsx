import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--hb-green)] text-white hover:bg-[var(--hb-green-hover)] border border-transparent',
  secondary:
    'bg-white text-[var(--hb-green)] border border-[rgba(26,92,58,0.2)] hover:bg-[var(--hb-mist)]',
  tertiary:
    'bg-transparent text-[var(--hb-green)] border border-[rgba(26,92,58,0.25)] hover:bg-[var(--hb-mist)]',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--hb-radius)] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 hb-focus-ring ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
