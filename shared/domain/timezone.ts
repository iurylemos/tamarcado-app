export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
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

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(values.find((item) => item.type === type)?.value);

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  };
}

export function localDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    throw new RangeError('Date must use YYYY-MM-DD.');
  }

  const [hour, minute] = time.split(':').map(Number);

  if (!hour || !minute) {
    throw new RangeError('Time must use HH:mm.');
  }

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
