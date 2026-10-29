import type { AnalysisReport } from '../schemas/report.schema';

export interface LlmUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface LlmGeneratedAnalysis {
  report: AnalysisReport;
  usage: LlmUsage;
}
