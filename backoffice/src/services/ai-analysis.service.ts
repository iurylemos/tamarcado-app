import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebase.config';
import type {
  StartAnalysisRequest,
  StartAnalysisResponse,
  GetAnalysisReportResponse,
} from '../interfaces/analysis.interface';

export async function startAnalysis(request: StartAnalysisRequest): Promise<StartAnalysisResponse> {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error('Entre na sua conta para continuar.');

  await currentUser.getIdToken(true);

  const result = await httpsCallable<StartAnalysisRequest, StartAnalysisResponse>(
    functions,
    'startAnalysis',
  )({
    idempotencyKey: request.idempotencyKey,
    goal: request.goal,
    period: { start: request.period.start, endExclusive: request.period.endExclusive },
  });

  return result.data;
}

export async function getAnalysisReport(executionId: string): Promise<GetAnalysisReportResponse> {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error('Entre na sua conta para continuar.');

  const result = await httpsCallable<
    Pick<StartAnalysisResponse, 'executionId'>,
    GetAnalysisReportResponse
  >(
    functions,
    'getAnalysisReport',
  )({ executionId });

  return result.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível iniciar a análise. Tente novamente.';
}
