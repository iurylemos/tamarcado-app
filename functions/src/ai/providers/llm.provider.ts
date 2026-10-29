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

  const {
    object,
    usage: { inputTokens, outputTokens, totalTokens },
  } = result;

  const report = reportSchema.parse(object);

  return {
    report,
    usage: {
      inputTokens: inputTokens ?? null,
      outputTokens: outputTokens ?? null,
      totalTokens: totalTokens ?? null,
    },
  };
}
