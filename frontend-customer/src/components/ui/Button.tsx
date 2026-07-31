import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const variantClass: Record<Variant, string> = {
  primary: 'hb-btn-primary',
  secondary: 'hb-btn-secondary',
  ghost: 'hb-btn-ghost',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`hb-btn ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
