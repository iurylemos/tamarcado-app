export type DomainErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'NOT_BOOKABLE'
  | 'SLOT_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'TEMPORARY_FAILURE';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
