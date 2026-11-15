import type { InsightsInput } from '../interfaces/insights.interface';
import type { LlmGeneratedAnalysis } from '../interfaces/llm.interface';
import { reportSchema } from '../schemas/report.schema';
import { openRouterApiKey } from '../config/analysis.secrets';
import {
  buildInsightsPrompt,
  createBusinessInsightsAgent,
} from '../agents/business-insights.agent';
import { AnalysisUtil } from '../utils/analysis.util';
import { LlmUtilProviderConfigurationError } from '../utils/llm.util';

export async function generateInsights(
  input: InsightsInput,
  agent?: ReturnType<typeof createBusinessInsightsAgent>,
  signal?: AbortSignal,
): Promise<LlmGeneratedAnalysis> {
  if (!openRouterApiKey.value()) {
    throw new LlmUtilProviderConfigurationError();
  }

  const currentAgent = agent ?? createBusinessInsightsAgent();

  const result = await currentAgent.generate(buildInsightsPrompt(input), {
    structuredOutput: { schema: reportSchema, errorStrategy: 'strict', jsonPromptInjection: true },
    modelSettings: {
      maxOutputTokens: AnalysisUtil.analysisRuntimeLimits.maxGeneratedTokens,
      temperature: 0.2,
      timeout: {
        totalMs: AnalysisUtil.analysisRuntimeLimits.stageBudgetMs.generation,
        stepMs: AnalysisUtil.analysisRuntimeLimits.stageBudgetMs.generation,
      },
    },
    maxSteps: 1,
    toolChoice: 'none',
    abortSignal: signal,
  });

  const report = reportSchema.parse(result.object);

  return {
    report,
    usage: {
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      totalTokens: result.usage?.totalTokens ?? null,
    },
  };
}
