import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import {
  listEligibleAppointmentProfessionals,
  updateAppointment,
  type UpdateAppointmentInput,
} from '../../services/appointment-operations.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const updateAppointmentCallable = onCall(callableOptionsCollaborator, async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  const data: unknown = request.data;
  if (typeof data !== 'object' || data === null) {
    throw new HttpsError('invalid-argument', 'Informe os novos dados do agendamento.');
  }
  const input = data as Record<string, unknown>;
  if (
    typeof input.appointmentId !== 'string' ||
    typeof input.startsAt !== 'string' ||
    typeof input.professionalId !== 'string'
  ) {
    throw new HttpsError('invalid-argument', 'Informe os novos dados do agendamento.');
  }
  return updateAppointment(actor, {
    appointmentId: input.appointmentId,
    startsAt: input.startsAt,
    professionalId: input.professionalId,
  } satisfies UpdateAppointmentInput);
});

export const listEligibleAppointmentProfessionalsCallable = onCall(
  callableOptionsCollaborator,
  async (request) => {
    const actor = await authorizeActor(request, ['collaborator']);
    const data: unknown = request.data;
    if (typeof data !== 'object' || data === null) {
      throw new HttpsError('invalid-argument', 'Informe o agendamento.');
    }
    const appointmentId = (data as Record<string, unknown>).appointmentId;
    if (typeof appointmentId !== 'string') {
      throw new HttpsError('invalid-argument', 'Informe o agendamento.');
    }
    return listEligibleAppointmentProfessionals(actor, appointmentId);
  },
);
