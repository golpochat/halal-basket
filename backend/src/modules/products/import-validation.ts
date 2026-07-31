export function assertBarcodeRequired(barcode: unknown): string {
  if (typeof barcode !== 'string' || !barcode.trim()) {
    throw new Error('barcode is required');
  }
  return barcode.trim();
}

export function parseIsActive(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
}
