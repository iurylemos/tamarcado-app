import { onCall } from 'firebase-functions/v2/https';
import { createPublicAppointment } from '../../services/booking.service';
import { callableOptionsPublic } from '../../options/callable.option';

export const createPublicAppointmentCallable = onCall(callableOptionsPublic, async (request) =>
  createPublicAppointment(request.data),
);
