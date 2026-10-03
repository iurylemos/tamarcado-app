import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { exportSalesReport } from '../../services/report.service';

export const exportSalesReportCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return exportSalesReport(actor.tenantId, request.data);
});
