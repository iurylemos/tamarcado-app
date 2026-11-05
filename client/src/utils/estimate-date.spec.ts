import { describe, expect, it } from 'vitest';
import { addCalendarDays, estimateDateFromInstant, isValidIanaTimezone } from '@shared/timezone';

describe('estimated delivery dates', () => {
  it('adds calendar days across weekends, months, and years', () => {
    expect(addCalendarDays('2026-11-06', 2)).toBe('2026-11-08');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('uses the business local date around timezone offset transitions', () => {
    expect(
      estimateDateFromInstant(new Date('2026-03-09T03:30:00.000Z'), 1, 'America/New_York'),
    ).toBe('2026-03-09');
    expect(
      estimateDateFromInstant(new Date('2026-11-02T04:30:00.000Z'), 1, 'America/New_York'),
    ).toBe('2026-11-02');
  });

  it('validates IANA timezones and rejects invalid calendar offsets', () => {
    expect(isValidIanaTimezone('America/Sao_Paulo')).toBe(true);
    expect(isValidIanaTimezone('Not/A_Timezone')).toBe(false);
    expect(() => addCalendarDays('2026-02-30', 1)).toThrow(RangeError);
    expect(() => addCalendarDays('2026-11-03', 0)).toThrow(RangeError);
  });
});
