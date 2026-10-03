import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { appointmentStatuses } from '../../../../shared/domain/appointment-status';
import { authorizeActor } from '../../services/authorization.service';
import { updateAppointmentStatus } from '../../services/appointment-operations.service';

export const updateAppointmentStatusCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  const data: unknown = request.data;
  if (typeof data !== 'object' || data === null) {
    throw new HttpsError('invalid-argument', 'Informe o agendamento e o novo status.');
  }
  const input = data as Record<string, unknown>;
  const status = appointmentStatuses.find((item) => item === input.status);
  if (typeof input.appointmentId !== 'string' || !status) {
    throw new HttpsError('invalid-argument', 'Informe o agendamento e um status válido.');
  }
  return updateAppointmentStatus(actor, input.appointmentId, status);
});
