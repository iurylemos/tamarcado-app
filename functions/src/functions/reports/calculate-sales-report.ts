import { type CallableRequest, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { calculateSalesReport } from '../../services/report.service';
import { callableOptionsBackoffice } from '../../options/callable.option';

export const calculateSalesReportCallable = onCall(
  callableOptionsBackoffice,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['backoffice']);
    return await calculateSalesReport(actor.tenantId, request.data);
  },
);
