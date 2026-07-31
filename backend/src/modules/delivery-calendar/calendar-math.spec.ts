import { nextDateForWeekday, startOfUtcDay } from './calendar-math';

describe('calendar-math', () => {
  it('skips today when today is the delivery weekday', () => {
    // 2026-07-28 was a Tuesday UTC
    const from = startOfUtcDay(new Date(Date.UTC(2026, 6, 28)));
    const next = nextDateForWeekday(from, 'tuesday');
    expect(next.toISOString().slice(0, 10)).toBe('2026-08-04');
  });

  it('resolves Lucan-style Tuesday from a Monday', () => {
    const from = startOfUtcDay(new Date(Date.UTC(2026, 6, 27))); // Monday
    const next = nextDateForWeekday(from, 'tuesday');
    expect(next.toISOString().slice(0, 10)).toBe('2026-07-28');
  });
});
