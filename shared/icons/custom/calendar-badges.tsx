import { createElement } from 'react';
import type { IconProps } from '../types';
import { ICON_SIZES } from '../types';
import { C, customSvg, strokeProps } from './svg';

const s = (color: string) => strokeProps(color);

type StockTone = 'in_stock' | 'low_stock' | 'out_of_stock';

/** Location pin — used with calendar rows */
export function LocationPinIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'pin',
        d: 'M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z',
        ...s(C.brand),
      }),
      createElement('circle', {
        key: 'dot',
        cx: 12,
        cy: 11,
        r: 2.2,
        fill: C.brandSoft,
        stroke: 'none',
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.md },
  );
}

/** Delivery calendar — frame + bar + location pin */
export function CalendarDayIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('rect', {
        key: 'frame',
        x: 3.5,
        y: 5,
        width: 17,
        height: 15,
        rx: 3,
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'bar',
        d: 'M3.5 9.5h17',
        ...s(C.brandSoft),
      }),
      createElement('path', {
        key: 'h1',
        d: 'M8 3.5v3',
        ...s(C.ink),
      }),
      createElement('path', {
        key: 'h2',
        d: 'M16 3.5v3',
        ...s(C.ink),
      }),
      createElement('path', {
        key: 'pin',
        d: 'M12 18.2s3.2-2.5 3.2-5a3.2 3.2 0 10-6.4 0c0 2.5 3.2 5 3.2 5z',
        ...s(C.brand),
      }),
      createElement('circle', {
        key: 'dot',
        cx: 12,
        cy: 13.1,
        r: 1.15,
        fill: C.accent,
        stroke: 'none',
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.md },
  );
}

/** Product badge: verified halal — crescent + check */
export function BadgeHalalIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'c',
        d: 'M14.2 5a6.8 6.8 0 104.6 12A5.6 5.6 0 0114.2 5z',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'check',
        d: 'M9.2 12l1.6 1.6 3.2-3.4',
        ...s(C.brandSoft),
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.badge },
  );
}

/** Product badge: shop partner — storefront */
export function BadgePartnerIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'roof',
        d: 'M4.5 11L12 5.5 19.5 11',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'wall',
        d: 'M6.5 11v8h11v-8',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'door',
        d: 'M10.5 19v-4h3v4',
        ...s(C.brandSoft),
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.badge },
  );
}

const STOCK_DOT: Record<StockTone, string> = {
  in_stock: C.brandSoft,
  low_stock: C.accent,
  out_of_stock: C.muted,
};

/** Stock indicator — solid colored dot (green / yellow / grey) */
export function StockDotIcon({
  stock,
  size = 8,
  className = '',
  title,
}: {
  stock: StockTone;
  size?: number;
  className?: string;
  title?: string;
}) {
  const fill = STOCK_DOT[stock];
  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 8 8',
      className,
      'aria-hidden': title ? undefined : true,
      role: title ? 'img' : undefined,
    },
    title ? createElement('title', null, title) : null,
    createElement('circle', { cx: 4, cy: 4, r: 3.2, fill }),
  );
}
