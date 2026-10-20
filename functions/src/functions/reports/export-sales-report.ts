import { type CallableRequest, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { exportSalesReport } from '../../services/report.service';
import { callableOptionsBackoffice } from '../../options/callable.option';

export const exportSalesReportCallable = onCall(
  callableOptionsBackoffice,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['backoffice']);
    return await exportSalesReport(actor.tenantId, request.data);
  },
);
