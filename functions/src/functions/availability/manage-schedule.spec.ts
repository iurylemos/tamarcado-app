import { describe, expect, it } from 'vitest';
import { saveBlockedPeriod, saveWorkingHours } from '../../services/backoffice.service';
import { localDateTimeToUtc } from '../../../../shared/domain/timezone';

describe('availability administration validation', () => {
  it.each([
    ['day outside ISO week', { dayOfWeek: 0 }],
    ['invalid local clock format', { startLocalTime: '9:00' }],
    ['start equal to end', { startLocalTime: '09:00', endLocalTime: '09:00' }],
    ['start after end', { startLocalTime: '18:00', endLocalTime: '09:00' }],
  ])('rejects %s', async (_label, changes) => {
    await expect(
      saveWorkingHours('tenant-aurora', {
        professionalId: 'professional-ana',
        dayOfWeek: 1,
        startLocalTime: '09:00',
        endLocalTime: '18:00',
        active: true,
        ...changes,
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('requires an increasing UTC blocked period', async () => {
    await expect(
      saveBlockedPeriod('tenant-aurora', 'admin', {
        startsAt: '2026-10-03T12:00:00.000Z',
        endsAt: '2026-10-03T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('interprets weekly clock values in the configured business timezone', () => {
    expect(localDateTimeToUtc('2026-01-15', '09:00', 'America/Sao_Paulo').toISOString()).toBe(
      '2026-01-15T12:00:00.000Z',
    );
  });
});
