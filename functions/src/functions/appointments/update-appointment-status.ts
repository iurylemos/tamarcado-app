import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { appointmentStatuses } from '../../../../shared/domain/appointment-status';
import { authorizeActor } from '../../services/authorization.service';
import { updateAppointmentStatus } from '../../services/appointment-operations.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const updateAppointmentStatusCallable = onCall(
  callableOptionsCollaborator,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['collaborator']);

    const { data } = request;

    if (typeof data !== 'object' || data === null) {
      throw new HttpsError('invalid-argument', 'Informe o agendamento e o novo status.');
    }

    const status = appointmentStatuses.find((item) => item === data.status);

    if (typeof data.appointmentId !== 'string' || !status) {
      throw new HttpsError('invalid-argument', 'Informe o agendamento e um status válido.');
    }

    return await updateAppointmentStatus(actor, data.appointmentId, status);
  },
);
