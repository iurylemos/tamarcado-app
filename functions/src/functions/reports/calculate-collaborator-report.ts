import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { calculateCollaboratorReport } from '../../services/report.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const calculateCollaboratorReportCallable = onCall(
  callableOptionsCollaborator,
  async (request) => {
    const actor = await authorizeActor(request, ['collaborator']);
    return calculateCollaboratorReport(actor, request.data);
  },
);
