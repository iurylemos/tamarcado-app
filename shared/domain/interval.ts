export interface TimeInterval {
  startsAt: number;
  endsAt: number;
}

export function isValidInterval(interval: TimeInterval): boolean {
  return Number.isFinite(interval.startsAt) && Number.isFinite(interval.endsAt) && interval.startsAt < interval.endsAt;
}

export function intervalsOverlap(first: TimeInterval, second: TimeInterval): boolean {
  return first.startsAt < second.endsAt && second.startsAt < first.endsAt;
}

export function fiveMinuteBucketStarts(interval: TimeInterval): number[] {
  if (!isValidInterval(interval)) throw new RangeError('Interval must have a start before its end.');
  const quantum = 5 * 60_000;
  const first = Math.floor(interval.startsAt / quantum) * quantum;
  const result: number[] = [];
  for (let bucket = first; bucket < interval.endsAt; bucket += quantum) result.push(bucket);
  return result;
}
