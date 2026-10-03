import { onCall } from 'firebase-functions/v2/https';
import { createPublicAppointment } from '../../services/booking.service';

export const createPublicAppointmentCallable = onCall(async (request) =>
  createPublicAppointment(request.data),
);
