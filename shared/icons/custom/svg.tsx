import { createElement, type ReactNode } from 'react';
import { resolveIconSize, type IconProps } from '../types';
import { CUSTOM_ICON_COLORS, CUSTOM_STROKE } from './colors';

/**
 * Custom two-tone SVG shell.
 * Stroke 2.5–3.5 · rounded joins · soft shadow via .hb-icon-brand
 */
export function customSvg(
  children: ReactNode,
  opts: IconProps & { defaultColor?: string } = {},
): ReactNode {
  const {
    size,
    className,
    title,
    color,
    defaultColor = CUSTOM_ICON_COLORS.brand,
  } = opts;
  const px = resolveIconSize(size);
  return createElement(
    'svg',
    {
      width: px,
      height: px,
      viewBox: '0 0 24 24',
      fill: 'none',
      className: `hb-icon-brand ${className ?? ''}`.trim(),
      style: { color: color ?? defaultColor },
      'aria-hidden': title ? undefined : true,
      role: title ? 'img' : undefined,
    },
    title ? createElement('title', null, title) : null,
    children,
  );
}

export function strokeProps(color: string, width = CUSTOM_STROKE) {
  return {
    stroke: color,
    strokeWidth: width,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
}

export const C = CUSTOM_ICON_COLORS;
