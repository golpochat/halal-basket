import type { FulfillmentMode, FulfillmentStatus } from '../types';

export type StatusTone = 'green' | 'gold' | 'muted' | 'danger' | 'warning';

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed_attempt: 'Attempt failed',
  cancelled: 'Cancelled',
};

const STATUS_TONES: Record<FulfillmentStatus, StatusTone> = {
  pending: 'muted',
  preparing: 'warning',
  ready: 'gold',
  out_for_delivery: 'green',
  delivered: 'green',
  failed_attempt: 'warning',
  cancelled: 'danger',
};

const MODE_LABELS: Record<FulfillmentMode, string> = {
  pickup: 'Pickup',
  scheduled_delivery: 'Scheduled delivery',
  realtime_delivery: 'Realtime delivery',
};

function titleCaseWords(raw: string): string {
  return raw
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatFulfillmentStatus(status: string): string {
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as FulfillmentStatus];
  }
  return titleCaseWords(status);
}

export function fulfillmentStatusTone(status: string): StatusTone {
  if (status in STATUS_TONES) {
    return STATUS_TONES[status as FulfillmentStatus];
  }
  return 'muted';
}

export function formatFulfillmentMode(mode: string): string {
  if (mode in MODE_LABELS) {
    return MODE_LABELS[mode as FulfillmentMode];
  }
  return titleCaseWords(mode);
}
