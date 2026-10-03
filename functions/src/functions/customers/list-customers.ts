import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { listCustomerHistory } from '../../services/customer-history.service';

export const listCustomersCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['collaborator']);
  return listCustomerHistory(actor);
});
