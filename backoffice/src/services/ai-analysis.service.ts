import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebase.config';

export interface StartAnalysisRequest {
  idempotencyKey: string;
  goal: string;
  period: { start: string; endExclusive: string };
}

export interface StartAnalysisResponse {
  executionId: string;
  status: 'queued';
  createdAt: string;
}

// The browser never sends a tenant: the backend derives it from the authenticated session.
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

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível iniciar a análise. Tente novamente.';
}
