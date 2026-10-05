import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { rebuildMonthlyReport } from '../../services/monthly-report.service';
import { callableOptionsBackoffice } from '../../options/callable.option';

export const rebuildMonthlyReportCallable = onCall(
  callableOptionsBackoffice,
  async (request) => {
    const actor = await authorizeActor(request, ['backoffice']);
    return rebuildMonthlyReport(actor.tenantId, request.data);
  },
);
