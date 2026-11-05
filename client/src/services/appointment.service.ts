import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';
import { trackClientRequest } from '../config/sentry.config';
import type {
  CreatePublicAppointmentInput,
  CreatePublicAppointmentResult,
} from '@shared/interfaces/appointment.interface';

export async function createAppointment(
  input: CreatePublicAppointmentInput,
): Promise<CreatePublicAppointmentResult> {
  return await trackClientRequest(
    SentryClientRequestOperation.APPOINTMENT_REGISTRATION,
    async (): Promise<CreatePublicAppointmentResult> => {
      const call = httpsCallable<CreatePublicAppointmentInput, CreatePublicAppointmentResult>(
        functions,
        'createPublicAppointment',
      );
      const response = await call(input);
      return response.data;
    },
  );
}
