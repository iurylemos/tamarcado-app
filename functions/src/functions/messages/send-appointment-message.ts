import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { sendAppointmentMessage } from '../../services/message.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const sendAppointmentMessageCallable = onCall(callableOptionsCollaborator, async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  const data: unknown = request.data;
  const input = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  if (typeof input.appointmentId !== 'string' || typeof input.content !== 'string') {
    throw new HttpsError('invalid-argument', 'Informe o agendamento e a mensagem.');
  }
  return sendAppointmentMessage(actor, {
    appointmentId: input.appointmentId,
    templateCategory: input.templateCategory,
    content: input.content,
  });
});