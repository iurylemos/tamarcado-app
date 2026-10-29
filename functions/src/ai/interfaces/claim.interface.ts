import type { AnalysisExecutionDocument } from '../../model/ai-analysis.model';

export type ClaimResult =
  | { state: 'missing' | 'terminal' | 'deadline' | 'leased' | 'invocation_limit' }
  | { state: 'claimed'; fencingToken: number; execution: AnalysisExecutionDocument };
