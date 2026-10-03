import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { calculateCollaboratorReport } from '../../services/report.service';

export const calculateCollaboratorReportCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  return calculateCollaboratorReport(actor, request.data);
});
