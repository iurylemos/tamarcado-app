import { type CallableRequest, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { listCustomerHistory } from '../../services/customer-history.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const listCustomersCallable = onCall(
  callableOptionsCollaborator,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['collaborator']);
    return await listCustomerHistory(actor);
  },
);
