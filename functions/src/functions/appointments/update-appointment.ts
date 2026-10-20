import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import {
  listEligibleAppointmentProfessionals,
  updateAppointment,
  type UpdateAppointmentInput,
} from '../../services/appointment-operations.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const updateAppointmentCallable = onCall(
  callableOptionsCollaborator,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['collaborator']);

    const { data } = request;

    if (typeof data !== 'object' || data === null) {
      throw new HttpsError('invalid-argument', 'Informe os novos dados do agendamento.');
    }

    if (
      typeof data.appointmentId !== 'string' ||
      typeof data.startsAt !== 'string' ||
      typeof data.professionalId !== 'string'
    ) {
      throw new HttpsError('invalid-argument', 'Informe os novos dados do agendamento.');
    }

    const appointmentId: UpdateAppointmentInput = {
      appointmentId: data.appointmentId,
      startsAt: data.startsAt,
      professionalId: data.professionalId,
    };

    return await updateAppointment(actor, appointmentId);
  },
);

export const listEligibleAppointmentProfessionalsCallable = onCall(
  callableOptionsCollaborator,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['collaborator']);

    const { data } = request;

    if (typeof data !== 'object' || data === null) {
      throw new HttpsError('invalid-argument', 'Informe o agendamento.');
    }

    if (typeof data.appointmentId !== 'string') {
      throw new HttpsError('invalid-argument', 'Informe o agendamento.');
    }

    return await listEligibleAppointmentProfessionals(actor, data.appointmentId);
  },
);
