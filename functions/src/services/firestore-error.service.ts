type ErrorRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ErrorRecord =>
  typeof value === 'object' && value !== null;

export function isFirestoreIndexUnavailableError(error: unknown): boolean {
  if (!isRecord(error) || (error.code !== 9 && error.code !== '9')) return false;

  const description = [error.message, error.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return description.includes('index');
}
