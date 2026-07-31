import { createElement, type ReactNode } from 'react';
import { resolveIconSize, type IconProps } from './types';

/**
 * Enterprise utility icons — Lucide Bold weight (stroke 2.5).
 * Use for header, cart, help, account, filters, location, search.
 */
const BOLD = {
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};

function utilIcon(
  children: ReactNode,
  viewBox = '0 0 24 24',
): (p?: IconProps) => ReactNode {
  return ({ size, className, title, color }: IconProps = {}) => {
    const px = resolveIconSize(size);
    return createElement(
      'svg',
      {
        width: px,
        height: px,
        viewBox,
        fill: 'none',
        className,
        style: color ? { color } : undefined,
        'aria-hidden': title ? undefined : true,
        role: title ? 'img' : undefined,
      },
      title ? createElement('title', null, title) : null,
      children,
    );
  };
}

const p = (d: string, key?: string) =>
  createElement('path', { key, d, ...BOLD });

const c = (cx: number, cy: number, r: number, key?: string) =>
  createElement('circle', {
    key,
    cx,
    cy,
    r,
    stroke: BOLD.stroke,
    strokeWidth: BOLD.strokeWidth,
    fill: 'none',
  });

export const UtilityIcons = {
  search: utilIcon([
    c(11, 11, 7, 'ring'),
    p('M20 20l-3.6-3.6', 'handle'),
  ]),
  cart: utilIcon([
    p('M6 6h15l-1.5 9H7.5L6 6z', 'bag'),
    p('M6 6L5 3H2', 'handle'),
    c(9, 20, 1.25, 'w1'),
    c(17, 20, 1.25, 'w2'),
  ]),
  help: utilIcon([
    c(12, 12, 9, 'ring'),
    p('M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4.5', 'q'),
    createElement('circle', {
      key: 'dot',
      cx: 12,
      cy: 17.5,
      r: 1.1,
      fill: 'currentColor',
    }),
  ]),
  account: utilIcon([
    c(12, 8, 3.5, 'head'),
    p('M5.5 19.5c1.8-3.2 4.2-4.5 6.5-4.5s4.7 1.3 6.5 4.5', 'body'),
  ]),
  filters: utilIcon([
    p('M4 6h16', 't'),
    p('M7 12h10', 'm'),
    p('M10 18h4', 'b'),
  ]),
  location: utilIcon([
    p('M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z', 'pin'),
    c(12, 10, 2.4, 'dot'),
  ]),
  /** Crosshair / “use my location” — Bold utility */
  locate: utilIcon([
    c(12, 12, 3.2, 'ring'),
    c(12, 12, 7.5, 'outer'),
    p('M12 2.5v3', 'n'),
    p('M12 18.5v3', 's'),
    p('M2.5 12h3', 'w'),
    p('M18.5 12h3', 'e'),
  ]),
  menu: utilIcon([
    p('M4 7h16', 'a'),
    p('M4 12h16', 'b'),
    p('M4 17h16', 'c'),
  ]),
  close: utilIcon([
    p('M6 6l12 12', 'a'),
    p('M18 6L6 18', 'b'),
  ]),
  chevronDown: utilIcon([p('M6 9l6 6 6-6', 'c')]),
  chevronRight: utilIcon([p('M9 6l6 6-6 6', 'c')]),
  grid: utilIcon([
    createElement('rect', {
      key: 'a',
      x: 4,
      y: 4,
      width: 7,
      height: 7,
      rx: 1.5,
      ...BOLD,
    }),
    createElement('rect', {
      key: 'b',
      x: 13,
      y: 4,
      width: 7,
      height: 7,
      rx: 1.5,
      ...BOLD,
    }),
    createElement('rect', {
      key: 'c',
      x: 4,
      y: 13,
      width: 7,
      height: 7,
      rx: 1.5,
      ...BOLD,
    }),
    createElement('rect', {
      key: 'd',
      x: 13,
      y: 13,
      width: 7,
      height: 7,
      rx: 1.5,
      ...BOLD,
    }),
  ]),
  list: utilIcon([
    p('M9 7h11', 'a'),
    p('M9 12h11', 'b'),
    p('M9 17h11', 'c'),
    createElement('circle', {
      key: 'd1',
      cx: 5,
      cy: 7,
      r: 1.35,
      fill: 'currentColor',
    }),
    createElement('circle', {
      key: 'd2',
      cx: 5,
      cy: 12,
      r: 1.35,
      fill: 'currentColor',
    }),
    createElement('circle', {
      key: 'd3',
      cx: 5,
      cy: 17,
      r: 1.35,
      fill: 'currentColor',
    }),
  ]),
} as const;

/**
 * Cart with count drawn in SVG space so the number sits
 * in the geometric center of the basket body at any size.
 */
export function CartWithCountIcon({
  count,
  size = 48,
  className,
}: {
  count: number;
  size?: number;
  className?: string;
}) {
  const label = count > 99 ? '99+' : String(Math.max(0, count));
  const fontSize = label.length >= 3 ? 5.5 : label.length === 2 ? 6.5 : 8;

  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      className,
      'aria-hidden': true,
    },
    createElement('path', {
      d: 'M6 6h15l-1.5 9H7.5L6 6z',
      ...BOLD,
    }),
    createElement('path', {
      d: 'M6 6L5 3H2',
      ...BOLD,
    }),
    createElement('circle', {
      cx: 9,
      cy: 20,
      r: 1.25,
      stroke: BOLD.stroke,
      strokeWidth: BOLD.strokeWidth,
      fill: 'none',
    }),
    createElement('circle', {
      cx: 17,
      cy: 20,
      r: 1.25,
      stroke: BOLD.stroke,
      strokeWidth: BOLD.strokeWidth,
      fill: 'none',
    }),
    createElement(
      'text',
      {
        x: 13.5,
        y: 10.4,
        textAnchor: 'middle',
        dominantBaseline: 'central',
        fill: 'currentColor',
        fontSize,
        fontWeight: 700,
        fontFamily: 'var(--font-body), system-ui, sans-serif',
        style: { letterSpacing: label.length > 2 ? '-0.04em' : undefined },
      },
      label,
    ),
  );
}

export type UtilityIconName = keyof typeof UtilityIcons;

export function UtilityIcon({
  name,
  ...props
}: IconProps & { name: UtilityIconName }) {
  return UtilityIcons[name](props);
}
