import type { ReactNode } from 'react';
import { createElement } from 'react';
import { ICON_SIZES, type IconSizeToken } from '../icons/types';

type SvgProps = { className?: string; size?: number };

/**
 * Brand category icons — thick organic stroke (2.75), rounded joins.
 * Keys must match CATEGORY_TREE ids.
 */
function icon(
  children: ReactNode,
  viewBox = '0 0 24 24',
): (p?: SvgProps) => ReactNode {
  return ({ className, size = ICON_SIZES.sm }: SvgProps = {}) =>
    createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox,
        fill: 'none',
        className: `hb-icon-brand ${className ?? ''}`.trim(),
        'aria-hidden': true,
      },
      children,
    );
}

const s = {
  stroke: 'currentColor',
  strokeWidth: 2.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const path = (d: string, key?: string) =>
  createElement('path', { key, d, ...s });

const circle = (cx: number, cy: number, r: number, key?: string) =>
  createElement('circle', {
    key,
    cx,
    cy,
    r,
    stroke: 'currentColor',
    strokeWidth: 2.75,
    fill: 'none',
  });

const ellipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  key?: string,
) =>
  createElement('ellipse', {
    key,
    cx,
    cy,
    rx,
    ry,
    stroke: 'currentColor',
    strokeWidth: 2.75,
    fill: 'none',
  });

const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  rx = 2.5,
  key?: string,
) =>
  createElement('rect', {
    key,
    x,
    y,
    width: w,
    height: h,
    rx,
    stroke: 'currentColor',
    strokeWidth: 2.75,
    fill: 'none',
  });

export const CategoryIcons: Record<string, (p?: SvgProps) => ReactNode> = {
  'meat-poultry': icon([
    path('M8.5 15.5c-2.2-2.2-2.5-5.5-.6-7.8 1.2-1.4 3.2-1.8 4.8-1.2', 'a'),
    path('M12.7 6.5c1.6.6 2.7 2.2 2.8 4 .1 2.2-1.1 4.2-3 5.2', 'b'),
    path('M9.2 16.8l-3.4 3.4', 'c'),
    path('M7.2 14.8l-2.2 2.2', 'd'),
    circle(14.5, 8.5, 1.6, 'e'),
  ]),
  chicken: icon([
    path(
      'M7 14c0-3.5 2.2-6.5 5-7.5 1.2-.4 2.5-.2 3.5.6 1.3 1 1.8 2.6 1.5 4.1-.2 1.2-.8 2.2-1.7 3',
      'body',
    ),
    path('M12 6.5c.8-1.8 2.4-2.8 3.2-2.8', 'comb'),
    path('M15.5 11.5c1.8.2 3.2 1.4 3.5 2.8', 'wing'),
    path('M9.5 16.5c-.5 1.5-1.2 2.5-2.5 3', 'leg'),
    path('M12.5 16.8c.2 1.4-.2 2.6-1.2 3.2', 'leg2'),
  ]),
  'chicken-fresh': icon([
    path('M5 13c2.5-4.5 11.5-4.5 14 0-2.5 3.8-11.5 3.8-14 0z', 'cut'),
    path('M8 12.5c1-.8 2.2-1.2 4-1.2s3 .4 4 1.2', 'grain'),
    path('M12 5.5v3', 'stem'),
    path('M10.5 6.5h3', 'leaf'),
  ]),
  'chicken-frozen': icon([
    rect(6, 8, 12, 11, 3, 'pack'),
    path('M12 4v4', 'v'),
    path('M9.5 5.5L12 8l2.5-2.5', 'a'),
    path('M8 10.5h8', 'h1'),
    path('M8 14h8', 'h2'),
    path('M8 17.5h5', 'h3'),
  ]),
  'beef-lamb': icon([
    ellipse(9, 12, 4.2, 5.2, 'a'),
    ellipse(15.5, 12.5, 3.5, 4.5, 'b'),
    path('M9 9.5c1 0 1.8.8 1.8 1.8', 'm1'),
    path('M15.5 10.5c.8 0 1.4.6 1.4 1.4', 'm2'),
  ]),
  beef: icon([
    path(
      'M4.5 12.5c1.5-4.5 13.5-4.5 15 0-1.2 3.8-6.5 5.5-7.5 5.5s-6.3-1.7-7.5-5.5z',
      'steak',
    ),
    path('M8 11.5c1.2-1 2.6-1.5 4-1.5s2.8.5 4 1.5', 'fat'),
    circle(12, 13.5, 1.4, 'bone'),
  ]),
  lamb: icon([
    path('M6 14c2-5 10-5 12 0-2 3.5-10 3.5-12 0z', 'chop'),
    path('M12 6.5v4.5', 'bone'),
    circle(12, 5.5, 1.8, 'knob'),
    path('M9.5 12.5h5', 'line'),
  ]),
  'fruits-veg': icon([
    path(
      'M12 8.5c-3.8.2-6.5 3.2-6.5 6.5 0 3.5 2.8 5.5 6.5 5.5s6.5-2 6.5-5.5c0-3.3-2.7-6.3-6.5-6.5z',
      'apple',
    ),
    path('M12 8.5c0-2 1.5-3.5 3-4', 'stem'),
    path('M12 8.5c-1.5-1.2-3.2-1.5-4-1.2', 'leaf'),
  ]),
  fruits: icon([
    circle(9, 13, 4.2, 'a'),
    circle(15, 12, 3.8, 'b'),
    path('M11 9c1-2.5 3-3.5 4-3.5', 'leaf'),
    path('M13.5 8.5c.5-1.5 1.8-2.5 2.5-2.5', 'leaf2'),
  ]),
  'fruits-fresh': icon([
    circle(12, 12, 7, 'o'),
    path('M12 5v14', 'v'),
    path('M5.5 9.5l13 5', 'd1'),
    path('M5.5 14.5l13-5', 'd2'),
    circle(12, 12, 1.5, 'c'),
  ]),
  vegetables: icon([
    path('M10 20.5c0-7 2-12 2-12s2 5 2 12H10z', 'body'),
    path('M12 8.5V4', 'stem'),
    path('M12 5.5c-2-1-3.5-1.2-4-.8', 'l1'),
    path('M12 5.5c2-1 3.5-1.2 4-.8', 'l2'),
    path('M10.5 14h3', 'ring'),
  ]),
  'veg-leafy': icon([
    path('M12 20c-4-1-7-5-7-9 0-2 1-4 3-5', 'l'),
    path('M12 20c4-1 7-5 7-9 0-2-1-4-3-5', 'r'),
    path('M12 20V7', 'vein'),
    path('M12 12c-2-.5-3.5-2-4-3.5', 'v1'),
    path('M12 12c2-.5 3.5-2 4-3.5', 'v2'),
    path('M12 5c-1-1.5-2.5-2-3-2', 'tip'),
  ]),
  cooking: icon([
    path('M5 11h14v7a3 3 0 01-3 3H8a3 3 0 01-3-3v-7z', 'pot'),
    path('M4 11h16', 'rim'),
    path('M9 11V8a3 3 0 016 0v3', 'handle'),
    path('M12 5.5V4', 'knob'),
    path('M8 15h8', 'steam-base'),
  ]),
  'oils-spices': icon([
    path('M7 4h4l1 3 1.5 13H5.5L7 7l0-3z', 'bottle'),
    path('M8 10h2', 'fill'),
    circle(17, 14, 3.5, 'spice'),
    path('M17 10.5v-2', 'stem'),
    path('M15.5 9h3', 'cap'),
  ]),
  oils: icon([
    path('M9 3h6l1 3.5L17.5 20H6.5L8 6.5 9 3z', 'b'),
    path('M10 9h4', 'line'),
    path('M11 4.5h2', 'neck'),
    path('M18 8c1.5 1 2.5 2.5 2.5 4', 'pour'),
  ]),
  spices: icon([
    path(
      'M12 3l1.8 4.2 4.5.4-3.4 3.2 1 4.4L12 13.5 7.1 15.2l1-4.4L4.7 7.6l4.5-.4L12 3z',
      'star',
    ),
    path('M8 20h8', 'base'),
  ]),
  grains: icon([
    path('M12 21V8', 'stem'),
    path('M12 10c-2.5-1-4-3-4-4.5', 'l1'),
    path('M12 10c2.5-1 4-3 4-4.5', 'r1'),
    path('M12 14c-2.8-1-4.5-3.2-4.5-5', 'l2'),
    path('M12 14c2.8-1 4.5-3.2 4.5-5', 'r2'),
    path('M12 18c-3-1-5-3.5-5-5.5', 'l3'),
    path('M12 18c3-1 5-3.5 5-5.5', 'r3'),
    path('M12 8c0-2 .8-3.5 2-4.5', 'tip'),
  ]),
  rice: icon([
    path('M5 12h14c0 4.5-3 7.5-7 7.5S5 16.5 5 12z', 'bowl'),
    path('M4.5 12h15', 'rim'),
    path('M9 10c0-1.5.8-3 1.5-3.5', 'grain1'),
    path('M12 9.5c0-2 1-3.5 2-4', 'grain2'),
    path('M14.5 10.5c.5-1.5 1.5-2.5 2-2.8', 'grain3'),
  ]),
  flour: icon([
    path('M7 8h10l1.5 12H5.5L7 8z', 'bag'),
    path('M7 8c0-2 2-3.5 5-3.5s5 1.5 5 3.5', 'top'),
    path('M9.5 13h5', 'label'),
    path('M10.5 16h3', 'label2'),
  ]),
  beverages: icon([
    path('M8 4h8l-1 16H9L8 4z', 'glass'),
    path('M9 10h6', 'level'),
    path('M10.5 7h3', 'ice'),
    path('M17 6c1.5 1 2.5 2.5 2.5 4', 'straw'),
  ]),
  'tea-coffee': icon([
    path('M6 9h11v7a3.5 3.5 0 01-3.5 3.5h-4A3.5 3.5 0 016 16V9z', 'cup'),
    path('M17 11h1.5a2.5 2.5 0 010 5H17', 'handle'),
    path('M9 6c0-1.2.8-2 1.5-2', 's1'),
    path('M12 5.5c0-1.2.8-2 1.5-2', 's2'),
    path('M14.5 6c0-1 .7-1.8 1.2-1.8', 's3'),
  ]),
  tea: icon([
    path('M7 10h9v6.5A3.5 3.5 0 0112.5 20h-2A3.5 3.5 0 017 16.5V10z', 'cup'),
    path('M16 12h2a2 2 0 010 4h-2', 'handle'),
    path('M10 6.5h4v3h-4v-3z', 'tag'),
    path('M12 9.5v3', 'string'),
  ]),
  'soft-drinks': icon([
    path('M8 6h8v14a1 1 0 01-1 1H9a1 1 0 01-1-1V6z', 'can'),
    path('M8 6c0-1.5 1.5-2.5 4-2.5s4 1 4 2.5', 'top'),
    path('M10 11h4', 'label'),
    path('M10.5 14h3', 'label2'),
    path('M9 8h6', 'ring'),
  ]),
  'home-cleaning': icon([
    path('M4 11l8-6 8 6', 'roof'),
    path('M6 10.5V19h12v-8.5', 'wall'),
    path('M10 19v-5h4v5', 'door'),
    path(
      'M17.5 6.5l.8 1.6 1.7.2-1.3 1.2.4 1.7-1.6-.9-1.6.9.4-1.7-1.3-1.2 1.7-.2.8-1.6z',
      'spark',
    ),
  ]),
  cleaning: icon([
    path('M9 8h5l1.5 12H7.5L9 8z', 'bottle'),
    path('M10 8V5.5h2.5V8', 'neck'),
    path('M12.5 5.5h3.5c1 0 1.5.8 1.5 1.5', 'nozzle'),
    path('M17.5 5l2-1.5', 'spray1'),
    path('M17.5 7l2 .2', 'spray2'),
    path('M9.5 13h4', 'label'),
  ]),
  laundry: icon([
    rect(5, 3.5, 14, 17, 3, 'machine'),
    circle(12, 13, 5, 'drum'),
    circle(12, 13, 2.5, 'inner'),
    path('M8 6.5h3', 'btn1'),
    path('M13 6.5h3', 'btn2'),
  ]),
  dairy: icon([
    path('M8 6l2-2h4l2 2v14H8V6z', 'carton'),
    path('M8 6h8', 'top'),
    path('M10 4v2', 'fold1'),
    path('M14 4v2', 'fold2'),
    path('M10 11h4', 'label'),
    path('M10.5 14h3', 'label2'),
  ]),
  milk: icon([
    path('M9 7h6l1 3v10a2 2 0 01-2 2H10a2 2 0 01-2-2V10l1-3z', 'bottle'),
    path('M9.5 4h5v3h-5V4z', 'cap'),
    path('M10.5 13h3', 'line'),
    path('M11 16h2', 'line2'),
  ]),
  eggs: icon([
    ellipse(12, 13, 5.5, 7.5, 'egg'),
    path('M9.5 11c1-1.5 2.5-2.2 4-2', 'shine'),
  ]),
  default: icon([
    rect(4, 4, 7, 7, 2.5, 'r1'),
    rect(13, 4, 7, 7, 2.5, 'r2'),
    rect(4, 13, 7, 7, 2.5, 'r3'),
    rect(13, 13, 7, 7, 2.5, 'r4'),
  ]),
};

export function categoryIcon(
  id: string,
  opts?: { size?: number; className?: string },
): ReactNode {
  const Icon = CategoryIcons[id] ?? CategoryIcons.default;
  return Icon({ size: opts?.size ?? ICON_SIZES.sm, className: opts?.className });
}

/** Soft badge used in sidebar / popular / subcategory grids. */
export function CategoryIconBadge({
  id,
  size = 'md',
  className = '',
}: {
  id: string;
  size?: number | IconSizeToken;
  className?: string;
}) {
  const px =
    typeof size === 'number'
      ? size
      : size === 'lg'
        ? ICON_SIZES.lg
        : size === 'sm'
          ? ICON_SIZES.sm
          : ICON_SIZES.md;
  const badgeClass =
    px >= ICON_SIZES.lg
      ? 'hb-icon-badge hb-icon-badge--lg'
      : px >= ICON_SIZES.md
        ? 'hb-icon-badge hb-icon-badge--md'
        : 'hb-icon-badge hb-icon-badge--sm';

  return createElement(
    'span',
    {
      className: `${badgeClass} ${className}`.trim(),
      'aria-hidden': true,
    },
    categoryIcon(id, { size: px }),
  );
}
