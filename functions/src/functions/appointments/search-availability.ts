import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { DomainError } from '../../../../shared/domain/errors';
import { callableOptionsPublic } from '../../options/callable.option';
import { searchAvailability } from '../../services/availability.service';
import { SearchAvailabilityInput } from '@shared/interfaces/availability.interface';

export const searchAvailabilityCallable = onCall(
  callableOptionsPublic,
  async (request: CallableRequest<SearchAvailabilityInput>) => {
    try {
      return await searchAvailability(request.data);
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
  },
);
