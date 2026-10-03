import { httpsCallable } from 'firebase/functions';
import type { SalesReport } from '@shared/reporting';
import { auth, functions } from '../config/firebase.config';
import type { ReportFilters } from '../interfaces/report.interface';

type CsvExport = {
  csv: string;
  filename: string;
};

type ProjectionRebuildResult = {
  written: number;
  year: number;
  month: number;
};

async function callable<TInput, TOutput>(name: string, data: TInput): Promise<TOutput> {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error('Entre na sua conta para continuar.');

  await currentUser.getIdToken(true);

  const result = await httpsCallable<TInput, TOutput>(functions, name)(data);

  return result.data;
}

export function getSalesReport(filters: ReportFilters): Promise<SalesReport> {
  return callable('calculateSalesReport', filters);
}

export async function exportSalesReport(filters: ReportFilters): Promise<void> {
  const result = await callable<ReportFilters, CsvExport>('exportSalesReport', filters);
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${result.csv}`], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function rebuildMonthlyReport(
  period: Pick<ReportFilters, 'year' | 'month'>,
): Promise<ProjectionRebuildResult> {
  return callable('rebuildMonthlyReport', period);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível concluir a operação. Tente novamente.';
}
