import { onCall } from 'firebase-functions/v2/https';
import { createPublicAppointment } from '../../services/booking.service';
import { callableOptionsPublic } from '../../options/callable.option';
import { runCallableWithDiagnostics } from '../../services/diagnostic-logging.service';

export const createPublicAppointmentCallable = onCall(
  callableOptionsPublic,
  async (request) =>
    await runCallableWithDiagnostics(
      {
        functionName: 'createPublicAppointment',
        operation: 'appointment_booking',
        stage: 'callable',
      },
      async () => await createPublicAppointment(request.data),
    ),
);
