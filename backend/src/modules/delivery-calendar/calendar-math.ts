/** Pure helpers for calendar math (unit-tested). */

export type WeekdayName =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

const WEEKDAY_INDEX: Record<WeekdayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Next occurrence of weekday after `from` (if today matches, returns next week). */
export function nextDateForWeekday(from: Date, day: WeekdayName): Date {
  const target = WEEKDAY_INDEX[day];
  const current = from.getUTCDay();
  let delta = (target - current + 7) % 7;
  if (delta === 0) delta = 7;
  const result = new Date(from);
  result.setUTCDate(result.getUTCDate() + delta);
  return result;
}
