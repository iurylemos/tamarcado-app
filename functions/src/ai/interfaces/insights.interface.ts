import type { AnalysisReport } from '../schemas/report.schema';

export interface InsightsInput {
  goal: string;
  metrics: unknown;
  sources: AnalysisReport['sources'];
  period: { start: string; endExclusive: string };
}
