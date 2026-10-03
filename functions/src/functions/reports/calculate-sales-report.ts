import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { calculateSalesReport } from '../../services/report.service';

export const calculateSalesReportCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return calculateSalesReport(actor.tenantId, request.data);
});
