import { createElement, type ReactNode } from 'react';
import { resolveIconSize, type IconProps } from '../types';

/**
 * Utility icons — Lucide Bold weight (stroke 2.5), monochrome currentColor.
 * Header, filters, cart, help, account, location, search.
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
        className: `hb-icon-utility ${className ?? ''}`.trim(),
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
  search: utilIcon([c(11, 11, 7, 'ring'), p('M20 20l-3.6-3.6', 'handle')]),
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
  locate: utilIcon([
    c(12, 12, 3.2, 'ring'),
    c(12, 12, 7.5, 'outer'),
    p('M12 2.5v3', 'n'),
    p('M12 18.5v3', 's'),
    p('M2.5 12h3', 'w'),
    p('M18.5 12h3', 'e'),
  ]),
  phone: utilIcon([
    p(
      'M6.5 3.5h3.2l1.2 3.2-2 1.2a12 12 0 005.4 5.4l1.2-2 3.2 1.2v3.2a2 2 0 01-2.2 2A16.5 16.5 0 014.5 5.7a2 2 0 012-2.2z',
      'handset',
    ),
  ]),
  menu: utilIcon([
    p('M4 7h16', 'a'),
    p('M4 12h16', 'b'),
    p('M4 17h16', 'c'),
  ]),
  close: utilIcon([p('M6 6l12 12', 'a'), p('M18 6L6 18', 'b')]),
  chevronDown: utilIcon([p('M6 9l6 6 6-6', 'c')]),
  chevronLeft: utilIcon([p('M15 6l-6 6 6 6', 'c')]),
  chevronRight: utilIcon([p('M9 6l6 6-6 6', 'c')]),
  refresh: utilIcon([
    p('M3 12a9 9 0 0115.5-6.4', 'a'),
    p('M21 3v6h-6', 'b'),
    p('M21 12a9 9 0 01-15.5 6.4', 'c'),
    p('M3 21v-6h6', 'd'),
  ]),
  ban: utilIcon([
    c(12, 12, 9, 'ring'),
    p('M6.5 6.5l11 11', 'slash'),
  ]),
  unlock: utilIcon([
    p('M8 11V8a4 4 0 017.2-2.4', 'shackle'),
    createElement('rect', {
      key: 'body',
      x: 5,
      y: 11,
      width: 14,
      height: 10,
      rx: 2,
      ...BOLD,
    }),
  ]),
  logout: utilIcon([
    p('M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4', 'door'),
    p('M16 12H8', 'line'),
    p('M14 8l4 4-4 4', 'arrow'),
  ]),
  home: utilIcon([
    p('M4 11.5L12 4l8 7.5', 'roof'),
    p('M6.5 10.5V20h11V10.5', 'body'),
  ]),
  chart: utilIcon([
    p('M4 19h16', 'base'),
    p('M7 16V10', 'a'),
    p('M12 16V6', 'b'),
    p('M17 16v-4', 'c'),
  ]),
  package: utilIcon([
    p('M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z', 'box'),
    p('M3.5 7.5L12 12l8.5-4.5', 'mid'),
    p('M12 12v9', 'seam'),
  ]),
  calendar: utilIcon([
    createElement('rect', {
      key: 'r',
      x: 4,
      y: 5,
      width: 16,
      height: 15,
      rx: 2,
      ...BOLD,
    }),
    p('M8 3v4', 'l'),
    p('M16 3v4', 'r'),
    p('M4 10h16', 'line'),
  ]),
  store: utilIcon([
    p('M4 9l1.5-4h13L20 9', 'awning'),
    p('M4 9v11h16V9', 'body'),
    p('M9 20v-6h6v6', 'door'),
  ]),
  users: utilIcon([
    c(9, 8, 3, 'a'),
    p('M3.5 19c1.5-3 3.5-4.5 5.5-4.5S13 16 14.5 19', 'a2'),
    c(16.5, 8.5, 2.4, 'b'),
    p('M15 14.5c2 .3 3.7 1.6 4.8 4.5', 'b2'),
  ]),
  shield: utilIcon([
    p('M12 3l8 3.5v5.5c0 5-3.4 8.3-8 9.5-4.6-1.2-8-4.5-8-9.5V6.5L12 3z', 's'),
  ]),
  tag: utilIcon([
    p('M3.5 12.5V5.5H10.5l8 8-7 7-8-8z', 'tag'),
    c(8, 8.5, 1.2, 'dot'),
  ]),
  globe: utilIcon([
    c(12, 12, 9, 'ring'),
    p('M3 12h18', 'eq'),
    p('M12 3c3 3.5 3 14.5 0 18', 'm1'),
    p('M12 3c-3 3.5-3 14.5 0 18', 'm2'),
  ]),
  truck: utilIcon([
    p('M3 7h11v10H3z', 'cab'),
    p('M14 10h4l3 3v4h-7v-7z', 'bed'),
    c(7, 18.5, 1.6, 'w1'),
    c(17.5, 18.5, 1.6, 'w2'),
  ]),
  spark: utilIcon([
    p('M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3z', 's'),
  ]),
  settings: utilIcon([
    c(12, 12, 3, 'core'),
    p(
      'M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6',
      'rays',
    ),
  ]),
  building: utilIcon([
    createElement('rect', {
      key: 'b',
      x: 5,
      y: 4,
      width: 14,
      height: 16,
      rx: 1.5,
      ...BOLD,
    }),
    p('M9 20v-4h6v4', 'door'),
    p('M8 8h2M14 8h2M8 12h2M14 12h2', 'win'),
  ]),
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
  edit: utilIcon([
    p('M4 20h4l10.5-10.5-4-4L4 16v4z', 'body'),
    p('M13.5 6.5l4 4', 'tip'),
  ]),
  trash: utilIcon([
    p('M5 7h14', 'lid'),
    p('M9 7V5h6v2', 'handle'),
    p('M7 7l1 13h8l1-13', 'bin'),
    p('M10 11v6M14 11v6', 'lines'),
  ]),
} as const;

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
  const fontSize = label.length >= 3 ? 5.5 : label.length === 2 ? 6.25 : 7.5;
  const light = {
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      className: `hb-icon-utility ${className ?? ''}`.trim(),
      'aria-hidden': true,
    },
    createElement('path', { d: 'M6 6h15l-1.5 9H7.5L6 6z', ...light }),
    createElement('path', { d: 'M6 6L5 3H2', ...light }),
    createElement('circle', {
      cx: 9,
      cy: 20,
      r: 1.25,
      stroke: light.stroke,
      strokeWidth: light.strokeWidth,
      fill: 'none',
    }),
    createElement('circle', {
      cx: 17,
      cy: 20,
      r: 1.25,
      stroke: light.stroke,
      strokeWidth: light.strokeWidth,
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
        fontWeight: 500,
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
