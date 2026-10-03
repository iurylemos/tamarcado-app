import { describe, expect, it } from 'vitest';
import { canTransitionAppointment } from '../../shared/domain/appointment-status';
import { fiveMinuteBucketStarts, intervalsOverlap } from '../../shared/domain/interval';
import { calculateCommissionCents } from '../../shared/domain/money';
import { isValidBrazilianPhone, normalizeBrazilianPhone } from '../../shared/domain/phone';
import { localDateTimeToUtc } from '../../shared/domain/timezone';

describe('shared domain rules', () => {
  it('limits appointment transitions to the defined lifecycle', () => {
    expect(canTransitionAppointment('pending', 'confirmed')).toBe(true);
    expect(canTransitionAppointment('pending', 'completed')).toBe(false);
    expect(canTransitionAppointment('cancelled', 'pending')).toBe(false);
  });

  it('uses half-open intervals and includes every intersecting five-minute reservation', () => {
    expect(intervalsOverlap({ startsAt: 0, endsAt: 5 }, { startsAt: 5, endsAt: 10 })).toBe(false);
    expect(fiveMinuteBucketStarts({ startsAt: 60_000, endsAt: 11 * 60_000 })).toEqual([0, 300_000, 600_000]);
  });

  it('calculates BRL commission with half-up rounding and fixed cents', () => {
    expect(calculateCommissionCents(101, 'percentage', 5000)).toBe(51);
    expect(calculateCommissionCents(10_000, 'fixed', 2500)).toBe(2500);
    expect(() => calculateCommissionCents(100, 'percentage', 10_001)).toThrow(RangeError);
  });

  it('normalizes Brazilian numbers with valid DDD and subscriber lengths', () => {
    expect(normalizeBrazilianPhone('(11) 99999-0000')).toBe('+5511999990000');
    expect(isValidBrazilianPhone('+55 21 3333-0000')).toBe(true);
    expect(isValidBrazilianPhone('(20) 99999-0000')).toBe(false);
  });

  it('converts business wall time to a UTC instant', () => {
    expect(localDateTimeToUtc('2030-02-04', '09:00', 'America/Sao_Paulo').toISOString())
      .toBe('2030-02-04T12:00:00.000Z');
  });
});
