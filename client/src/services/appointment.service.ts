import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';
import type { BookingInput, BookingResult } from '../interfaces/appointment.interface';

export async function createAppointment(input: BookingInput): Promise<BookingResult> {
  const call = httpsCallable<BookingInput, BookingResult>(functions, 'createPublicAppointment');
  const response = await call(input);
  return response.data;
}
