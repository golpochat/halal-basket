import { assertBarcodeRequired, parseIsActive } from './import-validation';

describe('import-validation', () => {
  it('requires barcode', () => {
    expect(() => assertBarcodeRequired('')).toThrow('barcode is required');
    expect(() => assertBarcodeRequired(undefined)).toThrow('barcode is required');
    expect(assertBarcodeRequired(' 123 ')).toBe('123');
  });

  it('parses is_active flags', () => {
    expect(parseIsActive('yes')).toBe(true);
    expect(parseIsActive('false')).toBe(false);
    expect(parseIsActive(undefined)).toBe(true);
  });
});
