import { describe, expect, it } from 'vitest';
import { isFirestoreIndexUnavailableError } from './firestore-error.service';

describe('isFirestoreIndexUnavailableError', () => {
  it('recognizes Firestore code 9 errors that require an index', () => {
    expect(
      isFirestoreIndexUnavailableError({
        code: 9,
        details: 'The query requires an index. That index is currently building.',
      }),
    ).toBe(true);
  });

  it('does not classify unrelated failed-precondition errors as index errors', () => {
    expect(isFirestoreIndexUnavailableError({ code: 9, details: 'Document precondition failed.' }))
      .toBe(false);
    expect(
      isFirestoreIndexUnavailableError({
        code: 'failed-precondition',
        message: 'The query requires an index.',
      }),
    ).toBe(false);
    expect(isFirestoreIndexUnavailableError(new Error('The query requires an index.'))).toBe(
      false,
    );
  });
});
