import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { collections } from '../../config/collections';
import { aggregatedMetricsSchema } from '../../ai/schemas/metrics.schema';
import { reportRequestSchema, reportSchema } from '../../ai/schemas/report.schema';
import type { AnalysisExecutionDocument } from '../../model/ai-analysis.model';
import { callableOptionsBackoffice } from '../../options/callable.option';
import { authorizeActor, type AuthorizedActor } from '../../services/authorization.service';
import { firestore } from '../../services/firestore.service';

export async function getAnalysisReport(
  actor: Pick<AuthorizedActor, 'tenantId'>,
  rawInput: unknown,
): Promise<Record<string, unknown>> {
  const parsed = reportRequestSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Informe uma execução válida.');
  }

  const snapshot = await firestore
    .collection(collections.aiAnalysisExecutions)
    .doc(parsed.data.executionId)
    .get();

  const execution = snapshot.data() as AnalysisExecutionDocument | undefined;

  if (!execution || execution.tenantId !== actor.tenantId) {
    throw new HttpsError('not-found', 'A análise não foi encontrada.');
  }

  if (execution.status !== 'succeeded') {
    return {
      status: execution.status,
      ...(execution.failure ? { failureCode: execution.failure.code } : {}),
    };
  }

  if (!execution.metrics || !execution.report) {
    throw new HttpsError('internal', 'O resultado da análise não passou pela validação.');
  }

  return {
    status: 'succeeded',
    metrics: aggregatedMetricsSchema.parse(execution.metrics),
    report: reportSchema.parse(execution.report),
  };
}

export const getAnalysisReportCallable = onCall(
  callableOptionsBackoffice,
  async (request: CallableRequest<unknown>): Promise<Record<string, unknown>> => {
    const actor = await authorizeActor(request, ['backoffice']);
    return await getAnalysisReport(actor, request.data);
  },
);
