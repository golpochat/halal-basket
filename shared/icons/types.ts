import type { ReactNode, SVGAttributes } from 'react';

/** Canonical icon sizes (px) for the Halal Basket two-tone system. */
export const ICON_SIZES = {
  /** Product badges */
  badge: 20,
  /** Sidebar + header chrome */
  sm: 24,
  /** Trust indicators + delivery calendar */
  md: 32,
  /** Popular category tiles (legacy) */
  lg: 48,
  /** Popular category tiles (premium) */
  xl: 56,
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

/** Placement roles → default pixel size */
export const ICON_PLACEMENT = {
  sidebar: ICON_SIZES.sm,
  header: ICON_SIZES.sm,
  trust: ICON_SIZES.md,
  calendar: ICON_SIZES.md,
  popular: ICON_SIZES.xl,
  badge: ICON_SIZES.badge,
} as const;
