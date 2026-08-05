/** Mirrors backend PlatformLocaleService.resolveDeliveryFee for live UI totals. */

export type DeliveryFeeConfig = {
  scheduledDeliveryFee: number;
  pickupFee: number;
  freeDeliveryOverAmount?: number;
  feesByArea?: Record<string, number>;
  areas?: Array<{
    areaName: string;
    deliveryDays?: string[];
    deliveryFee?: number;
  }>;
};

export function resolveDeliveryFee(input: {
  mode: 'pickup' | 'scheduled_delivery' | 'realtime_delivery' | string;
  areaName?: string | null;
  subtotal: number;
  config: DeliveryFeeConfig;
}): number {
  if (input.mode === 'pickup') {
    return roundMoney(input.config.pickupFee);
  }

  const area = input.areaName?.trim() ?? '';
  const fromMap =
    area && input.config.feesByArea && input.config.feesByArea[area] != null
      ? input.config.feesByArea[area]
      : undefined;
  const fromAreas = input.config.areas?.find((a) => a.areaName === area)
    ?.deliveryFee;
  const base =
    fromMap ?? fromAreas ?? input.config.scheduledDeliveryFee;

  const freeOver = input.config.freeDeliveryOverAmount ?? 0;
  if (freeOver > 0 && input.subtotal >= freeOver) {
    return 0;
  }
  return roundMoney(base);
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/** Keep EUR formatting local — avoids circular import via @halal-basket/web. */
export function formatEuroFee(amount: number) {
  if (amount === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      numberingSystem: 'latn',
    }).format(amount);
  } catch {
    return `€${amount.toFixed(2)}`;
  }
}
