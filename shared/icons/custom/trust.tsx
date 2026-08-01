import { createElement } from 'react';
import type { IconProps } from '../types';
import { ICON_SIZES } from '../types';
import { C, customSvg, strokeProps } from './svg';

const s = (color: string, w = 2.75) => strokeProps(color, w);

/** Trust: verified halal — crescent + checkmark */
export function TrustHalalIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'crescent',
        d: 'M15 4.2a8 8 0 105.5 14.2A6.6 6.6 0 0115 4.2z',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'check',
        d: 'M9.2 12.2l2 2 4-4.4',
        ...s(C.brandSoft),
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.md },
  );
}

/** Trust: local shop — storefront + stock box */
export function TrustLocalStockIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'roof',
        d: 'M3.5 10.5L12 4l8.5 6.5',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'wall',
        d: 'M5.5 10.5V19.5h13V10.5',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'door',
        d: 'M10.5 19.5v-5h3v5',
        ...s(C.ink),
      }),
      createElement('rect', {
        key: 'box',
        x: 14.2,
        y: 12.2,
        width: 5.2,
        height: 4.2,
        rx: 1.2,
        ...s(C.brandSoft),
      }),
      createElement('path', {
        key: 'box-lid',
        d: 'M14.2 13.6h5.2',
        ...s(C.accent),
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.md },
  );
}

/** Trust: fulfillment — van + pickup bag */
export function TrustFulfillmentIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'van',
        d: 'M2.8 15.2V9.2h9.2v6',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'cab',
        d: 'M12 11.8h3.8l2.4 3.4H12',
        ...s(C.brand),
      }),
      createElement('circle', {
        key: 'w1',
        cx: 6.2,
        cy: 17.2,
        r: 1.6,
        ...s(C.ink),
      }),
      createElement('circle', {
        key: 'w2',
        cx: 15.8,
        cy: 17.2,
        r: 1.6,
        ...s(C.ink),
      }),
      createElement('path', {
        key: 'bag',
        d: 'M18.2 6.2h3.6l-.6 6.2h-2.4l-.6-6.2z',
        ...s(C.brandSoft),
      }),
      createElement('path', {
        key: 'handle',
        d: 'M19 6.2V5a1.2 1.2 0 012.4 0v1.2',
        ...s(C.accent),
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.md },
  );
}

/** Trust: clear fees — receipt + checkmark */
export function TrustFeesIcon(props?: IconProps) {
  return customSvg(
    [
      createElement('path', {
        key: 'sheet',
        d: 'M6.5 3.5h9A2.2 2.2 0 0117.7 5.7v14l-1.8-1.1-1.8 1.1-1.8-1.1-1.8 1.1-1.8-1.1-1.2.7V5.7A2.2 2.2 0 016.5 3.5z',
        ...s(C.brand),
      }),
      createElement('path', {
        key: 'l1',
        d: 'M9 8.2h6',
        ...s(C.muted),
      }),
      createElement('path', {
        key: 'l2',
        d: 'M9 11.2h6',
        ...s(C.ink),
      }),
      createElement('path', {
        key: 'check',
        d: 'M9.2 15.2l1.7 1.7 3.6-3.8',
        ...s(C.brandSoft),
      }),
    ],
    { ...props, size: props?.size ?? ICON_SIZES.md },
  );
}

export const TRUST_ITEMS = [
  { id: 'halal', label: 'Verified halal', Icon: TrustHalalIcon },
  { id: 'stock', label: 'Local shop stock', Icon: TrustLocalStockIcon },
  { id: 'fulfillment', label: 'Delivery or pickup', Icon: TrustFulfillmentIcon },
  { id: 'fees', label: 'Clear fees', Icon: TrustFeesIcon },
] as const;
