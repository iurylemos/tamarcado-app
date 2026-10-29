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

export interface AnalysisMetric {
  available: boolean;
  value?: number;
  limitation?: string;
}

export interface AnalysisMetrics {
  coverage: 'sufficient' | 'no_data';
  appointmentCount: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  completedSalesCents: AnalysisMetric;
  completedCommissionCents: AnalysisMetric;
  occupancy: AnalysisMetric;
  periodComparison: AnalysisMetric;
}

export interface AnalysisReport {
  summary: string;
  facts: Array<{
    id: string;
    statement: string;
    source: { type: 'metric' | 'web'; reference: string };
  }>;
  inferences: Array<{
    id: string;
    statement: string;
    evidenceReferences: string[];
    uncertainty: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    rationale: string;
    priority: 'low' | 'medium' | 'high';
    evidenceReferences: string[];
  }>;
  limitations: string[];
  sources: Array<{ title: string; url: string; snippet: string }>;
}

export type GetAnalysisReportResponse =
  | {
      status: 'queued' | 'running' | 'failed' | 'timed_out' | 'cancelled';
      failureCode?: string;
    }
  | { status: 'succeeded'; metrics: AnalysisMetrics; report: AnalysisReport };

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

export async function getAnalysisReport(executionId: string): Promise<GetAnalysisReportResponse> {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error('Entre na sua conta para continuar.');

  const result = await httpsCallable<
    { executionId: string },
    GetAnalysisReportResponse
  >(functions, 'getAnalysisReport')({ executionId });

  return result.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível iniciar a análise. Tente novamente.';
}
