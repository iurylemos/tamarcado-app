import { getZonedDateTimeParts } from '@shared/timezone';

export function getDateInBusinessTimezone(
  now = new Date(),
  timezone = 'America/Sao_Paulo',
): string {
  const { year, month, day } = getZonedDateTimeParts(now, timezone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getNextBookableDate(now = new Date(), timezone = 'America/Sao_Paulo'): string {
  const [year, month, day] = getDateInBusinessTimezone(now, timezone).split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error('Invalid date format');
  }

  const candidate = new Date(Date.UTC(year, month - 1, day + 1));

  if (candidate.getUTCDay() === 0) candidate.setUTCDate(candidate.getUTCDate() + 1);

  return `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, '0')}-${String(candidate.getUTCDate()).padStart(2, '0')}`;
}
