import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';
import type { BookingInput, BookingResult } from '../interfaces/appointment.interface';
import { trackClientRequest } from '../config/sentry.config';

export async function createAppointment(input: BookingInput): Promise<BookingResult> {
  return await trackClientRequest(
    SentryClientRequestOperation.APPOINTMENT_REGISTRATION,
    async (): Promise<BookingResult> => {
      const call = httpsCallable<BookingInput, BookingResult>(functions, 'createPublicAppointment');
      const response = await call(input);
      return response.data;
    },
  );
}
