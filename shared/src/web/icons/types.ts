import type { ReactNode, SVGAttributes } from 'react';

/** Canonical icon sizes — use these tokens everywhere. */
export const ICON_SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZES;

export type IconProps = {
  size?: number | IconSizeToken;
  className?: string;
  /** Accessible title; omit for decorative (aria-hidden) icons */
  title?: string;
  color?: string;
};

export function resolveIconSize(size?: number | IconSizeToken): number {
  if (size == null) return ICON_SIZES.sm;
  if (typeof size === 'number') return size;
  return ICON_SIZES[size];
}

export type IconComponent = (props?: IconProps) => ReactNode;

export type SvgBaseProps = SVGAttributes<SVGSVGElement> & {
  size?: number | IconSizeToken;
  title?: string;
};
