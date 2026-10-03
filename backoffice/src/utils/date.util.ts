import { getZonedDateTimeParts, localDateTimeToUtc } from '@shared/timezone';
import type { DateWeekday } from '../interfaces/date.interface';

export class DateUtil {
  public static readonly weekdays: DateWeekday[] = [
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
    { value: 7, label: 'Domingo', short: 'Dom' },
  ];

  public static formatDateTimeInput(date: Date, timezone: string): string {
    const parts = getZonedDateTimeParts(date, timezone);

    return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  }

  public static initialLocalDateTime(offsetDays: number, hour: number, timezone: string): string {
    const now = getZonedDateTimeParts(new Date(), timezone);

    const date = new Date(Date.UTC(now.year, now.month - 1, now.day + offsetDays, hour));

    const localDate = `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

    const localTime = `${String(hour).padStart(2, '0')}:00`;

    return this.formatDateTimeInput(localDateTimeToUtc(localDate, localTime, timezone), timezone);
  }

  public static toUtc(value: string, timezone: string): string {
    const [date, time] = value.split('T');

    if (!date || !time) throw new Error('Informe uma data e hora completas.');

    return localDateTimeToUtc(date, time, timezone).toISOString();
  }
}
