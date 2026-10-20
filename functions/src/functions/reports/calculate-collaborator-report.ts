import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { calculateCollaboratorReport } from '../../services/report.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const calculateCollaboratorReportCallable = onCall(
  callableOptionsCollaborator,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['collaborator']);
    return await calculateCollaboratorReport(actor, request.data);
  },
);
