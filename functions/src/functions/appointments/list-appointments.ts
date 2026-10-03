import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { listAppointments } from '../../services/appointment-operations.service';

export const listAppointmentsCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  return listAppointments(actor, request.data);
});
