import { createElement, type ReactNode } from 'react';
import { ICON_SIZES, resolveIconSize, type IconSizeToken } from '../types';
import { CUSTOM_ICON_COLORS as C, CUSTOM_STROKE } from './colors';

type SvgProps = { className?: string; size?: number };

/**
 * Two-tone category icons — metaphors from the Halal Basket icon system.
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

const brand = {
  stroke: C.brand,
  strokeWidth: CUSTOM_STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};
const soft = {
  stroke: C.brandSoft,
  strokeWidth: CUSTOM_STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};
const ink = {
  stroke: C.ink,
  strokeWidth: CUSTOM_STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};
const accent = {
  stroke: C.accent,
  strokeWidth: CUSTOM_STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};

const path = (
  d: string,
  tone: 'brand' | 'soft' | 'ink' | 'accent' = 'brand',
  key?: string,
) =>
  createElement('path', {
    key,
    d,
    ...(tone === 'soft'
      ? soft
      : tone === 'ink'
        ? ink
        : tone === 'accent'
          ? accent
          : brand),
  });

const circle = (
  cx: number,
  cy: number,
  r: number,
  tone: 'brand' | 'soft' | 'ink' | 'accent' = 'brand',
  key?: string,
) =>
  createElement('circle', {
    key,
    cx,
    cy,
    r,
    ...(tone === 'soft'
      ? soft
      : tone === 'ink'
        ? ink
        : tone === 'accent'
          ? accent
          : brand),
  });

const ellipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tone: 'brand' | 'soft' | 'ink' | 'accent' = 'brand',
  key?: string,
) =>
  createElement('ellipse', {
    key,
    cx,
    cy,
    rx,
    ry,
    ...(tone === 'soft'
      ? soft
      : tone === 'ink'
        ? ink
        : tone === 'accent'
          ? accent
          : brand),
  });

const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  rx = 3,
  tone: 'brand' | 'soft' | 'ink' | 'accent' = 'brand',
  key?: string,
) =>
  createElement('rect', {
    key,
    x,
    y,
    width: w,
    height: h,
    rx,
    ...(tone === 'soft'
      ? soft
      : tone === 'ink'
        ? ink
        : tone === 'accent'
          ? accent
          : brand),
  });

export const CategoryIcons: Record<string, (p?: SvgProps) => ReactNode> = {
  /** Meat & Poultry — drumstick + leaf */
  'meat-poultry': icon([
    path(
      'M8 16c-2-2-2.4-5.2-.4-7.4 1.2-1.4 3.4-1.8 5-.8',
      'brand',
      'leg',
    ),
    path('M12.6 7.8c1.8.8 2.8 2.6 2.6 4.6-.2 2.2-1.6 4-3.4 4.8', 'soft', 'meat'),
    path('M9.4 16.8l-3.6 3.4', 'ink', 'bone'),
    path('M7.2 14.8l-2.4 2.2', 'ink', 'bone2'),
    path('M16.5 5.5c-1.2.2-2.2 1-2.6 2', 'soft', 'leaf'),
    path('M16.5 5.5c.2-1.4 1.2-2.4 2.4-2.6', 'accent', 'leaf2'),
  ]),

  /** Fruits & Vegetables — apple + leaf */
  'fruits-veg': icon([
    path(
      'M12 8.2c-3.6.2-6.2 3-6.2 6.2 0 3.4 2.6 5.6 6.2 5.6s6.2-2.2 6.2-5.6c0-3.2-2.6-6-6.2-6.2z',
      'brand',
      'apple',
    ),
    path('M12 8.2c0-2 1.4-3.4 2.8-3.8', 'ink', 'stem'),
    path('M12 8.2c-1.6-1.4-3.4-1.6-4.2-1.2', 'soft', 'leaf'),
  ]),

  /** Cooking Essentials — pot + steam */
  cooking: icon([
    path('M5 11.5h14v6.5a3 3 0 01-3 3H8a3 3 0 01-3-3v-6.5z', 'brand', 'pot'),
    path('M4 11.5h16', 'soft', 'rim'),
    path('M9 11.5V8.5a3 3 0 016 0v3', 'ink', 'handle'),
    path('M9 5.2c.6-1 1.4-1.5 2-1.5', 'soft', 'steam1'),
    path('M12 4.5c.6-1 1.4-1.5 2-1.5', 'accent', 'steam2'),
    path('M15 5.2c.5-.8 1.2-1.2 1.8-1.2', 'soft', 'steam3'),
  ]),

  /** Beverages — cup + droplet */
  beverages: icon([
    path('M6.5 9h10v7a3.5 3.5 0 01-3.5 3.5h-3A3.5 3.5 0 016.5 16V9z', 'brand', 'cup'),
    path('M16.5 11h1.8a2.4 2.4 0 010 4.8H16.5', 'soft', 'handle'),
    path('M12 4.2c1.6 1.6 1.6 3.2 0 4.2-1.6-1-1.6-2.6 0-4.2z', 'accent', 'drop'),
  ]),

  /** Home & Cleaning — spray bottle + sparkle */
  'home-cleaning': icon([
    path('M8 8.5h5l1.6 11.5H6.4L8 8.5z', 'brand', 'bottle'),
    path('M9.2 8.5V5.8h2.6V8.5', 'ink', 'neck'),
    path('M11.8 5.8h3.8c1 0 1.6.8 1.6 1.6', 'soft', 'nozzle'),
    path('M17.2 5l2-1.4', 'accent', 'spray1'),
    path('M17.2 7l2 .2', 'accent', 'spray2'),
    path(
      'M18.8 12.2l.6 1.2 1.3.15-1 1 .3 1.3-1.2-.7-1.2.7.3-1.3-1-1 1.3-.15.6-1.2z',
      'soft',
      'spark',
    ),
  ]),

  /** Dairy & Eggs — milk carton + egg */
  dairy: icon([
    path('M4.5 7l1.6-1.8h4.2L12 7v12.5H4.5V7z', 'brand', 'carton'),
    path('M4.5 7h7.5', 'soft', 'top'),
    path('M6.2 5.2v1.8', 'ink', 'fold1'),
    path('M9.8 5.2v1.8', 'ink', 'fold2'),
    path('M6.5 11.5h3.5', 'ink', 'label'),
    ellipse(17.2, 13.5, 3.6, 5.2, 'soft', 'egg'),
    path('M15.4 11.2c.8-1.2 2-1.8 3.2-1.6', 'accent', 'shine'),
  ]),

  /** Oils & Spices — bottle + spice leaf */
  'oils-spices': icon([
    path('M5.5 4h4.2l1 3 1.4 13H5.1L6.5 7l0-3z', 'brand', 'bottle'),
    path('M6.8 10.5h2', 'soft', 'fill'),
    path('M16.5 8.5c-2.2 1-3.5 3.2-3.5 5.5 0 2.8 1.8 4.5 3.5 4.5s3.5-1.7 3.5-4.5c0-2.3-1.3-4.5-3.5-5.5z', 'soft', 'leaf'),
    path('M16.5 8.5V6.2', 'ink', 'stem'),
    path('M15 7.2h3', 'accent', 'tip'),
  ]),

  /** Rice & Grains — rice bowl */
  grains: icon([
    path('M4.5 12.5h15c0 4.2-2.8 7-7.5 7s-7.5-2.8-7.5-7z', 'brand', 'bowl'),
    path('M4 12.5h16', 'soft', 'rim'),
    path('M8.5 10c0-1.4.7-2.8 1.4-3.2', 'ink', 'g1'),
    path('M11.5 9.5c0-1.8.9-3.2 1.8-3.6', 'soft', 'g2'),
    path('M14.2 10.2c.4-1.4 1.4-2.4 1.9-2.6', 'accent', 'g3'),
  ]),
  rice: icon([
    path('M4.5 12.5h15c0 4.2-2.8 7-7.5 7s-7.5-2.8-7.5-7z', 'brand', 'bowl'),
    path('M4 12.5h16', 'soft', 'rim'),
    path('M8.5 10c0-1.4.7-2.8 1.4-3.2', 'ink', 'g1'),
    path('M11.5 9.5c0-1.8.9-3.2 1.8-3.6', 'soft', 'g2'),
    path('M14.2 10.2c.4-1.4 1.4-2.4 1.9-2.6', 'accent', 'g3'),
  ]),

  /** Tea & Coffee — mug + steam */
  'tea-coffee': icon([
    path('M5.5 9.5h11v7a3.5 3.5 0 01-3.5 3.5h-4A3.5 3.5 0 015.5 16.5v-7z', 'brand', 'mug'),
    path('M16.5 11.5h2a2.5 2.5 0 010 5h-2', 'soft', 'handle'),
    path('M8.5 5.5c0-1.2.8-2 1.5-2', 'soft', 's1'),
    path('M11.5 5c0-1.2.8-2 1.5-2', 'accent', 's2'),
    path('M14.2 5.5c0-1 .7-1.8 1.2-1.8', 'soft', 's3'),
  ]),
  tea: icon([
    path('M5.5 9.5h11v7a3.5 3.5 0 01-3.5 3.5h-4A3.5 3.5 0 015.5 16.5v-7z', 'brand', 'mug'),
    path('M16.5 11.5h2a2.5 2.5 0 010 5h-2', 'soft', 'handle'),
    path('M9.5 6h4v3h-4V6z', 'ink', 'tag'),
    path('M11.5 9v3', 'ink', 'string'),
  ]),

  /** Soft drinks — bottle + fizz */
  'soft-drinks': icon([
    path('M9 6.5h6v13a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 19.5v-13z', 'brand', 'bottle'),
    path('M9 6.5c0-1.6 1.4-2.8 3-2.8s3 1.2 3 2.8', 'soft', 'cap'),
    path('M10.5 12h3', 'ink', 'label'),
    circle(17.5, 8, 0.7, 'accent', 'f1'),
    circle(19, 10.5, 0.55, 'soft', 'f2'),
    circle(17.2, 12.5, 0.65, 'accent', 'f3'),
  ]),

  /** Cleaning — broom + sparkle */
  cleaning: icon([
    path('M12 3.5v10', 'ink', 'handle'),
    path('M7.5 14.5h9l-1.2 6.5H8.7L7.5 14.5z', 'brand', 'bristles'),
    path('M8.5 16.5h7', 'soft', 'line'),
    path(
      'M18 6.5l.7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.8-1.4.8.3-1.5-1.1-1.1 1.5-.2.7-1.4z',
      'accent',
      'spark',
    ),
  ]),

  // —— Nested / leaf categories (two-tone variants) ——
  chicken: icon([
    path(
      'M7 14c0-3.5 2.2-6.5 5-7.5 1.2-.4 2.5-.2 3.5.6 1.3 1 1.8 2.6 1.5 4.1-.2 1.2-.8 2.2-1.7 3',
      'brand',
      'body',
    ),
    path('M12 6.5c.8-1.8 2.4-2.8 3.2-2.8', 'soft', 'comb'),
    path('M15.5 11.5c1.8.2 3.2 1.4 3.5 2.8', 'soft', 'wing'),
    path('M9.5 16.5c-.5 1.5-1.2 2.5-2.5 3', 'ink', 'leg'),
    path('M12.5 16.8c.2 1.4-.2 2.6-1.2 3.2', 'ink', 'leg2'),
  ]),
  'chicken-fresh': icon([
    path('M5 13c2.5-4.5 11.5-4.5 14 0-2.5 3.8-11.5 3.8-14 0z', 'brand', 'cut'),
    path('M8 12.5c1-.8 2.2-1.2 4-1.2s3 .4 4 1.2', 'soft', 'grain'),
    path('M12 5.5v3', 'ink', 'stem'),
    path('M10.5 6.5h3', 'accent', 'leaf'),
  ]),
  'chicken-frozen': icon([
    rect(6, 8, 12, 11, 3, 'brand', 'pack'),
    path('M12 4v4', 'ink', 'v'),
    path('M9.5 5.5L12 8l2.5-2.5', 'soft', 'a'),
    path('M8 10.5h8', 'soft', 'h1'),
    path('M8 14h8', 'ink', 'h2'),
  ]),
  'beef-lamb': icon([
    ellipse(9, 12, 4.2, 5.2, 'brand', 'a'),
    ellipse(15.5, 12.5, 3.5, 4.5, 'soft', 'b'),
    path('M9 9.5c1 0 1.8.8 1.8 1.8', 'ink', 'm1'),
  ]),
  beef: icon([
    path(
      'M4.5 12.5c1.5-4.5 13.5-4.5 15 0-1.2 3.8-6.5 5.5-7.5 5.5s-6.3-1.7-7.5-5.5z',
      'brand',
      'steak',
    ),
    path('M8 11.5c1.2-1 2.6-1.5 4-1.5s2.8.5 4 1.5', 'soft', 'fat'),
    circle(12, 13.5, 1.4, 'ink', 'bone'),
  ]),
  lamb: icon([
    path('M6 14c2-5 10-5 12 0-2 3.5-10 3.5-12 0z', 'brand', 'chop'),
    path('M12 6.5v4.5', 'ink', 'bone'),
    circle(12, 5.5, 1.8, 'soft', 'knob'),
  ]),
  fruits: icon([
    circle(9, 13, 4.2, 'brand', 'a'),
    circle(15, 12, 3.8, 'soft', 'b'),
    path('M11 9c1-2.5 3-3.5 4-3.5', 'ink', 'leaf'),
  ]),
  'fruits-fresh': icon([
    circle(12, 12, 7, 'brand', 'o'),
    path('M12 5v14', 'soft', 'v'),
    path('M5.5 9.5l13 5', 'soft', 'd1'),
    circle(12, 12, 1.5, 'accent', 'c'),
  ]),
  vegetables: icon([
    path('M10 20.5c0-7 2-12 2-12s2 5 2 12H10z', 'brand', 'body'),
    path('M12 8.5V4', 'ink', 'stem'),
    path('M12 5.5c-2-1-3.5-1.2-4-.8', 'soft', 'l1'),
    path('M12 5.5c2-1 3.5-1.2 4-.8', 'soft', 'l2'),
  ]),
  'veg-leafy': icon([
    path('M12 20c-4-1-7-5-7-9 0-2 1-4 3-5', 'brand', 'l'),
    path('M12 20c4-1 7-5 7-9 0-2-1-4-3-5', 'soft', 'r'),
    path('M12 20V7', 'ink', 'vein'),
  ]),
  oils: icon([
    path('M9 3h6l1 3.5L17.5 20H6.5L8 6.5 9 3z', 'brand', 'b'),
    path('M10 9h4', 'soft', 'line'),
    path('M18 8c1.5 1 2.5 2.5 2.5 4', 'accent', 'pour'),
  ]),
  spices: icon([
    path(
      'M12 3l1.8 4.2 4.5.4-3.4 3.2 1 4.4L12 13.5 7.1 15.2l1-4.4L4.7 7.6l4.5-.4L12 3z',
      'brand',
      'star',
    ),
    path('M8 20h8', 'ink', 'base'),
  ]),
  flour: icon([
    path('M7 8h10l1.5 12H5.5L7 8z', 'brand', 'bag'),
    path('M7 8c0-2 2-3.5 5-3.5s5 1.5 5 3.5', 'soft', 'top'),
    path('M9.5 13h5', 'ink', 'label'),
  ]),
  laundry: icon([
    rect(5, 3.5, 14, 17, 3, 'brand', 'machine'),
    circle(12, 13, 5, 'soft', 'drum'),
    circle(12, 13, 2.5, 'ink', 'inner'),
  ]),
  milk: icon([
    path('M9 7h6l1 3v10a2 2 0 01-2 2H10a2 2 0 01-2-2V10l1-3z', 'brand', 'bottle'),
    path('M9.5 4h5v3h-5V4z', 'soft', 'cap'),
    path('M10.5 13h3', 'ink', 'line'),
  ]),
  eggs: icon([
    ellipse(12, 13, 5.5, 7.5, 'brand', 'egg'),
    path('M9.5 11c1-1.5 2.5-2.2 4-2', 'soft', 'shine'),
  ]),
  default: icon([
    rect(4, 4, 7, 7, 2.5, 'brand', 'r1'),
    rect(13, 4, 7, 7, 2.5, 'soft', 'r2'),
    rect(4, 13, 7, 7, 2.5, 'soft', 'r3'),
    rect(13, 13, 7, 7, 2.5, 'ink', 'r4'),
  ]),
};

export function categoryIcon(
  id: string,
  opts?: { size?: number; className?: string },
): ReactNode {
  const Icon = CategoryIcons[id] ?? CategoryIcons.default;
  return Icon({
    size: opts?.size ?? ICON_SIZES.sm,
    className: opts?.className,
  });
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
  const px = resolveIconSize(size);
  const badgeClass =
    px >= ICON_SIZES.xl
      ? 'hb-icon-badge hb-icon-badge--xl'
      : px >= ICON_SIZES.lg
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
