import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { listAvailableSlots } from '../../services/availability.service';
import { DomainError } from '../../../../shared/domain/errors';

export const listAvailability = onCall(async (request) => {
  try {
    return await listAvailableSlots(request.data);
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      const code =
        error.code === 'NOT_FOUND'
          ? 'not-found'
          : error.code === 'NOT_BOOKABLE'
            ? 'failed-precondition'
            : error.code === 'INVALID_INPUT'
              ? 'invalid-argument'
              : 'internal';

      throw new HttpsError(code, error.message);
    }

    throw error;
  }
});
