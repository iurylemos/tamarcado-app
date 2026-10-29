import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { startAnalysisInputSchema } from '../../ai/schemas/analysis-input.schema';
import { createQueuedExecution } from '../../ai/services/checkpoint.service';
import { collections } from '../../config/collections';
import { analysisSchemaVersion } from '../../model/ai-analysis.model';
import type { TenantDocument } from '../../model/tenant.model';
import { callableOptionsBackoffice } from '../../options/callable.option';
import { authorizeActor, type AuthorizedActor } from '../../services/authorization.service';
import { firestore } from '../../services/firestore.service';
import {
  ActiveUtilAnalysisError,
  AnalysisUtilIdempotencyConflictError,
} from '../../ai/utils/analysis.util';

export interface StartAnalysisResult {
  executionId: string;
  status: 'queued';
  createdAt: string;
}

export async function startAnalysis(
  actor: Pick<AuthorizedActor, 'tenantId' | 'uid'>,
  rawInput: unknown,
  now: Date = new Date(),
): Promise<StartAnalysisResult> {
  const parsed = startAnalysisInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Informe um objetivo e um período válidos.');
  }
  const input = parsed.data;

  const tenant = (
    await firestore.collection(collections.tenants).doc(actor.tenantId).get()
  ).data() as TenantDocument | undefined;

  if (!tenant?.timezone) {
    throw new HttpsError('failed-precondition', 'O fuso horário da empresa não está configurado.');
  }

  try {
    const { executionId, createdAt } = await createQueuedExecution(
      {
        tenantId: actor.tenantId,
        requesterUid: actor.uid,
        idempotencyKey: input.idempotencyKey,
        request: {
          schemaVersion: analysisSchemaVersion,
          goal: input.goal,
          period: input.period,
          timezone: tenant.timezone,
        },
      },
      now,
    );
    return {
      executionId,
      status: 'queued',
      createdAt: createdAt.toDate().toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof AnalysisUtilIdempotencyConflictError) {
      throw new HttpsError(
        'already-exists',
        'Esta chave de solicitação já foi usada com dados diferentes.',
      );
    }

    if (error instanceof ActiveUtilAnalysisError) {
      throw new HttpsError('failed-precondition', 'Já existe uma análise em andamento.');
    }
    throw error;
  }
}

export const startAnalysisCallable = onCall(
  callableOptionsBackoffice,
  async (request: CallableRequest<unknown>) => {
    const actor = await authorizeActor(request, ['backoffice']);
    return await startAnalysis(actor, request.data);
  },
);
