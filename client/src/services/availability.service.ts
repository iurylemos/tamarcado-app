import { httpsCallable } from 'firebase/functions';
import type {
  AvailableSlot,
  ListAvailabilityInput,
} from '@shared/interfaces/availability.interface';
import { functions } from '../config/firebase.config';

export async function listAvailability(input: ListAvailabilityInput): Promise<AvailableSlot[]> {
  const call = httpsCallable<ListAvailabilityInput, AvailableSlot[]>(functions, 'listAvailability');
  const response = await call(input);
  return response.data;
}
