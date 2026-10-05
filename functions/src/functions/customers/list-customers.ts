import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { listCustomerHistory } from '../../services/customer-history.service';
import { callableOptionsCollaborator } from '../../options/callable.option';

export const listCustomersCallable = onCall(callableOptionsCollaborator, async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  return listCustomerHistory(actor);
});
