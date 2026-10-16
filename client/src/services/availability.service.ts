import { httpsCallable } from 'firebase/functions';
import type {
  AvailableSlot,
  ListAvailabilityInput,
  SearchAvailabilityInput,
  SearchAvailabilityResult,
} from '@shared/interfaces/availability.interface';
import { functions } from '../config/firebase.config';
import { trackClientRequest } from '../config/sentry.config';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';

export async function listAvailability(input: ListAvailabilityInput): Promise<AvailableSlot[]> {
  const call = httpsCallable<ListAvailabilityInput, AvailableSlot[]>(functions, 'listAvailability');
  const response = await call(input);
  return response.data;
}

export async function searchAvailability(
  input: SearchAvailabilityInput,
): Promise<SearchAvailabilityResult> {
  return await trackClientRequest(
    SentryClientRequestOperation.AVAILABILITY_SEARCH,
    async (): Promise<SearchAvailabilityResult> => {
      const call = httpsCallable<SearchAvailabilityInput, SearchAvailabilityResult>(
        functions,
        'searchAvailability',
      );
      const response = await call(input);
      return response.data;
    },
  );
}
