import { createElement, type ReactNode } from 'react';
import { resolveIconSize, type IconProps } from './types';

/**
 * Custom brand icons — rounded, thick-stroke, organic, warm palette.
 * Stroke 2.5–3 · corner radius 6–10px · soft shadow via .hb-icon-brand
 *
 * Colors: #2E7D32 · #8BC34A · #F9A825 · #4E4E4E
 */
export const BRAND_ICON_COLORS = {
  green: '#2E7D32',
  leaf: '#8BC34A',
  gold: '#F9A825',
  ink: '#4E4E4E',
} as const;

const STROKE = 2.75;

function brandSvg(
  children: ReactNode,
  opts: IconProps & { defaultColor?: string } = {},
): ReactNode {
  const {
    size,
    className,
    title,
    color,
    defaultColor = BRAND_ICON_COLORS.green,
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

const stroke = (color?: string) => ({
  stroke: color ?? 'currentColor',
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

/** Trust: verified halal crescent + check */
export function TrustHalalIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('path', {
        key: 'crescent',
        d: 'M14.5 4.5a7.5 7.5 0 105.2 13.2A6.2 6.2 0 0114.5 4.5z',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'check',
        d: 'M9.5 12.2l1.8 1.8 3.4-3.8',
        ...stroke(BRAND_ICON_COLORS.leaf),
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.green },
  );
}

/** Trust: local shop / storefront */
export function TrustLocalStockIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('path', {
        key: 'roof',
        d: 'M4.5 10.5L12 4.5l7.5 6',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'wall',
        d: 'M6.5 10.5V19h11v-8.5',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'door',
        d: 'M10.5 19v-4.5h3V19',
        ...stroke(BRAND_ICON_COLORS.leaf),
      }),
      createElement('path', {
        key: 'awning',
        d: 'M6.5 12.5h11',
        ...stroke(BRAND_ICON_COLORS.gold),
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.green },
  );
}

/** Trust: delivery van / pickup bag hybrid */
export function TrustFulfillmentIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('path', {
        key: 'body',
        d: 'M3.5 15.5V9.5h10v6',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'cab',
        d: 'M13.5 12.5h4.2l2.3 3v0H13.5',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('circle', {
        key: 'w1',
        cx: 7,
        cy: 17.5,
        r: 1.75,
        ...stroke(BRAND_ICON_COLORS.ink),
      }),
      createElement('circle', {
        key: 'w2',
        cx: 17,
        cy: 17.5,
        r: 1.75,
        ...stroke(BRAND_ICON_COLORS.ink),
      }),
      createElement('path', {
        key: 'base',
        d: 'M3.5 15.5h16',
        ...stroke(BRAND_ICON_COLORS.leaf),
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.green },
  );
}

/** Trust: clear fees / receipt */
export function TrustFeesIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('path', {
        key: 'sheet',
        d: 'M7 3.5h8.5A2.5 2.5 0 0118 6v13.2l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-1 0.6V6A2.5 2.5 0 017 3.5z',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'l1',
        d: 'M9.5 8.5h5',
        ...stroke(BRAND_ICON_COLORS.gold),
      }),
      createElement('path', {
        key: 'l2',
        d: 'M9.5 12h5',
        ...stroke(BRAND_ICON_COLORS.ink),
      }),
      createElement('path', {
        key: 'l3',
        d: 'M9.5 15.5h3',
        ...stroke(BRAND_ICON_COLORS.ink),
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.green },
  );
}

/** Delivery calendar day tile */
export function CalendarDayIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('rect', {
        key: 'frame',
        x: 3.5,
        y: 5,
        width: 17,
        height: 15,
        rx: 3,
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'bar',
        d: 'M3.5 9.5h17',
        ...stroke(BRAND_ICON_COLORS.leaf),
      }),
      createElement('path', {
        key: 'h1',
        d: 'M8 3.5v3',
        ...stroke(BRAND_ICON_COLORS.ink),
      }),
      createElement('path', {
        key: 'h2',
        d: 'M16 3.5v3',
        ...stroke(BRAND_ICON_COLORS.ink),
      }),
      createElement('circle', {
        key: 'dot',
        cx: 12,
        cy: 14.5,
        r: 1.6,
        fill: BRAND_ICON_COLORS.gold,
        stroke: 'none',
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.green },
  );
}

/** Product badge: verified halal */
export function BadgeHalalIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('path', {
        key: 'c',
        d: 'M14.2 5a6.8 6.8 0 104.6 12A5.6 5.6 0 0114.2 5z',
        ...stroke(BRAND_ICON_COLORS.gold),
      }),
      createElement('path', {
        key: 'check',
        d: 'M9.2 12l1.6 1.6 3.2-3.4',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.gold, size: props?.size ?? 14 },
  );
}

/** Product badge: shop partner */
export function BadgePartnerIcon(props?: IconProps) {
  return brandSvg(
    [
      createElement('path', {
        key: 'shield',
        d: 'M12 3.5l7 3v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5l7-3z',
        ...stroke(BRAND_ICON_COLORS.green),
      }),
      createElement('path', {
        key: 'check',
        d: 'M9 12.2l2 2 4-4.2',
        ...stroke(BRAND_ICON_COLORS.leaf),
      }),
    ],
    { ...props, defaultColor: BRAND_ICON_COLORS.green, size: props?.size ?? 14 },
  );
}

export const TRUST_ITEMS = [
  {
    id: 'halal',
    label: 'Verified halal',
    Icon: TrustHalalIcon,
  },
  {
    id: 'stock',
    label: 'Local shop stock',
    Icon: TrustLocalStockIcon,
  },
  {
    id: 'fulfillment',
    label: 'Delivery or pickup',
    Icon: TrustFulfillmentIcon,
  },
  {
    id: 'fees',
    label: 'Clear fees',
    Icon: TrustFeesIcon,
  },
] as const;
