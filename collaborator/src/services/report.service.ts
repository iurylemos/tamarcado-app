import { httpsCallable } from 'firebase/functions';
import type { SalesReport } from '@shared/reporting';
import { auth, functions } from '../config/firebase.config';

export interface ReportPeriodRequest {
  year?: number;
  month?: number;
}

async function callable<TInput, TOutput>(name: string, data: TInput): Promise<TOutput> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Entre na sua conta de colaborador para continuar.');
  await currentUser.getIdToken(true);
  const result = await httpsCallable<TInput, TOutput>(functions, name)(data);
  return result.data;
}

export function getCollaboratorReport(period: ReportPeriodRequest = {}): Promise<SalesReport> {
  return callable('calculateCollaboratorReport', period);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível carregar o relatório. Tente novamente.';
}
