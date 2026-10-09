import { httpsCallable } from 'firebase/functions';
import type {
  AvailableSlot,
  ListAvailabilityInput,
  SearchAvailabilityInput,
  SearchAvailabilityResult,
} from '@shared/interfaces/availability.interface';
import { functions } from '../config/firebase.config';

export async function listAvailability(input: ListAvailabilityInput): Promise<AvailableSlot[]> {
  const call = httpsCallable<ListAvailabilityInput, AvailableSlot[]>(functions, 'listAvailability');
  const response = await call(input);
  return response.data;
}

export async function searchAvailability(
  input: SearchAvailabilityInput,
): Promise<SearchAvailabilityResult> {
  const startedAt = globalThis.performance.now();
  try {
    const call = httpsCallable<SearchAvailabilityInput, SearchAvailabilityResult>(
      functions,
      'searchAvailability',
    );
    const response = await call(input);
    return response.data;
  } finally {
    console.info('booking.performance', {
      operation: 'availability_search',
      stage: 'client_request',
      durationMs: Math.round(globalThis.performance.now() - startedAt),
    });
  }
}
