type ErrorRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ErrorRecord =>
  typeof value === 'object' && value !== null;

const isInternalStatus = (value: unknown): boolean =>
  typeof value === 'string' && /^(?:functions\/)?internal(?:\[\d+\])?$/i.test(value.trim());

export function getBookingErrorMessage(error: unknown, fallback: string): string {
  const root = isRecord(error) ? error : undefined;
  const nested = root && isRecord(root.error) ? root.error : undefined;
  const details = nested ?? root;
  const code = details?.code ?? root?.code;
  const status = details?.status ?? root?.status;
  const message = details?.message ?? root?.message;

  if (
    isInternalStatus(code) ||
    isInternalStatus(status) ||
    (typeof message === 'string' && isInternalStatus(message)) ||
    (typeof message === 'string' && /"status"\s*:\s*"INTERNAL"/i.test(message))
  ) {
    return fallback;
  }

  return typeof message === 'string' && message.trim() ? message : fallback;
}
