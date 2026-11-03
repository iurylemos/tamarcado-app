export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone) return false;

  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function part(values: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(values.find((item) => item.type === type)?.value);
}

export function getZonedDateTimeParts(date: Date, timeZone: string): LocalDateTimeParts {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return {
    year: part(values, 'year'),
    month: part(values, 'month'),
    day: part(values, 'day'),
    hour: part(values, 'hour'),
    minute: part(values, 'minute'),
  };
}

export function addCalendarDays(date: string, days: number): string {
  if (!isValidDateString(date) || !Number.isSafeInteger(days) || days <= 0) {
    throw new RangeError('A valid date and a positive integer day offset are required.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`;
}

export function estimateDateFromInstant(instant: Date, days: number, timeZone: string): string {
  if (!Number.isFinite(instant.getTime()) || !Number.isSafeInteger(days) || days <= 0) {
    throw new RangeError('A valid instant and a positive integer day offset are required.');
  }

  const local = getZonedDateTimeParts(instant, timeZone);
  const localDate = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  return addCalendarDays(localDate, days);
}

export function localDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    throw new RangeError('Date must use YYYY-MM-DD.');
  }

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Time must use HH:mm.');
  }
  const [hour, minute] = time.split(':').map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new RangeError('Date and time must use YYYY-MM-DD and HH:mm.');
  }

  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = getZonedDateTimeParts(new Date(candidate), timeZone);
    const observed = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    candidate += target - observed;
  }

  const result = new Date(candidate);
  const actual = getZonedDateTimeParts(result, timeZone);

  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    throw new RangeError('The requested local time does not exist in this time zone.');
  }
  return result;
}

export function isoWeekday(date: string): number {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    throw new RangeError('Date must use YYYY-MM-DD.');
  }

  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    throw new RangeError('Date must use YYYY-MM-DD.');
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
  );
}
