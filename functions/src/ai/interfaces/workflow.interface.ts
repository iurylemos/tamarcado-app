import type { InsightsInput } from './insights.interface';
import type { LlmGeneratedAnalysis } from './llm.interface';
import type { TavilyResearchSource } from './tavily.interface';

export interface GrowthWorkflowDependencies {
  search: (goal: string) => Promise<TavilyResearchSource[]>;
  generate: (input: InsightsInput, signal?: AbortSignal) => Promise<LlmGeneratedAnalysis>;
  now: () => Date;
}
