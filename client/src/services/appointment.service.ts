import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase-functions.config';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';
import type {
  CreatePublicAppointmentInput,
  CreatePublicAppointmentResult,
} from '@shared/interfaces/appointment.interface';
import { SentryUtil } from '../utils/sentry.util';

export class AppointmentService {
  public static async createAppointment(
    input: CreatePublicAppointmentInput,
  ): Promise<CreatePublicAppointmentResult> {
    return await SentryUtil.trackClientRequest(
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
}
