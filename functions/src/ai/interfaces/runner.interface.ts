import type { AggregatedMetrics } from '../../model/ai-analysis.model';
import type { GrowthWorkflowDependencies } from './workflow.interface';

export type RunnerOutcome = 'processed' | 'skipped' | 'fenced' | 'leased' | 'retry';

export interface RunnerDependencies extends GrowthWorkflowDependencies {
  getMetrics: (executionId: string) => Promise<AggregatedMetrics>;
  newOwner: () => string;
}
