import { type CallableRequest, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { rebuildMonthlyReport } from '../../services/monthly-report.service';
import { callableOptionsBackoffice } from '../../options/callable.option';

export const rebuildMonthlyReportCallable = onCall(
  callableOptionsBackoffice,
  async (request: CallableRequest<Record<string, unknown>>) => {
    const actor = await authorizeActor(request, ['backoffice']);
    return await rebuildMonthlyReport(actor.tenantId, request.data);
  },
);
