import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import { getZonedDateTimeParts } from '@shared/timezone';
import type { BookingReceipt } from '../interfaces/booking.interface';

export class DateUtil {
  public static getDateInBusinessTimezone(
    now = new Date(),
    timezone = 'America/Sao_Paulo',
  ): string {
    const { year, month, day } = getZonedDateTimeParts(now, timezone);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  public static getNextBookableDate(now = new Date(), timezone = 'America/Sao_Paulo'): string {
    const [year, month, day] = DateUtil.getDateInBusinessTimezone(now, timezone)
      .split('-')
      .map(Number);

    if (!year || !month || !day) {
      throw new Error('Invalid date format');
    }

    const candidate = new Date(Date.UTC(year, month - 1, day + 1));

    if (candidate.getUTCDay() === 0) candidate.setUTCDate(candidate.getUTCDate() + 1);

    return `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, '0')}-${String(candidate.getUTCDate()).padStart(2, '0')}`;
  }

  public static addDaysToDate(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);

    if (
      !year ||
      !month ||
      !day ||
      !Number.isInteger(days) ||
      new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date
    ) {
      throw new Error('Invalid date or day offset');
    }

    const candidate = new Date(Date.UTC(year, month - 1, day + days));
    return `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, '0')}-${String(candidate.getUTCDate()).padStart(2, '0')}`;
  }

  public static formatTimeRange(slot: AvailableSlot | BookingReceipt): string {
    const formatTime = (value: string): string =>
      new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(value));

    return `${formatTime(slot.startsAt)} - ${formatTime(slot.endsAt)}`;
  }

  public static productDate(value: string, timeZone: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeZone,
    }).format(new Date(value));
  }

  public static civilDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }
}
