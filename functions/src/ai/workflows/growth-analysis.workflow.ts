import { logger } from 'firebase-functions';
import type { LlmGeneratedAnalysis } from '../interfaces/llm.interface';
import type { GrowthWorkflowDependencies } from '../interfaces/workflow.interface';
import type { TavilyResearchSource } from '../interfaces/tavily.interface';
import type { InsightsInput } from '../interfaces/insights.interface';
import type { AggregatedMetrics, AnalysisExecutionDocument } from '../../model/ai-analysis.model';
import type { CheckpointLeaseHolder } from '../interfaces/checkpoint.interface';
import {
  completeAnalysis,
  beginStage,
  recordFailure,
  saveStageCheckpoint,
} from '../services/checkpoint.service';
import {
  WorkflowUtil,
  WorkflowUtilStageError,
  WorkflowUtilStageTimeoutError,
} from '../utils/workflow.util';
import { reportSchema, reportSourcesSchema, type AnalysisReport } from '../schemas/report.schema';
import { stageBudgetMs } from '../services/limits.service';
import { aggregatedMetricsSchema } from '../schemas/metrics.schema';
import { CheckpointUtil } from '../utils/checkpoint.util';

async function withTimeout<T>(
  work: Promise<T>,
  budgetMs: number,
  onTimeout?: () => void,
): Promise<T> {
  if (budgetMs <= 0) throw new WorkflowUtilStageTimeoutError();
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          onTimeout?.();
          reject(new WorkflowUtilStageTimeoutError());
        }, budgetMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function validateEvidence(
  report: AnalysisReport,
  metrics: AggregatedMetrics,
  sources: TavilyResearchSource[],
  execution: AnalysisExecutionDocument,
): AnalysisReport {
  logger.info('ai_growth_analysis.validation.started', {
    correlationId: execution.correlationId,
    reportPeriod: report.period,
    expectedPeriod: execution.request.period,
    metrics,
    reportSources: report.sources,
    expectedSources: sources,
    facts: report.facts,
    inferences: report.inferences,
    recommendations: report.recommendations,
  });

  if (
    report.period.start !== execution.request.period.start ||
    report.period.endExclusive !== execution.request.period.endExclusive
  ) {
    throw new TypeError('Analysis report period does not match the authorized execution.');
  }

  const expectedSources = reportSourcesSchema.parse(sources);

  const checkSources =
    CheckpointUtil.canonicalJson(report.sources) !== CheckpointUtil.canonicalJson(expectedSources);

  if (checkSources) {
    throw new TypeError('Analysis report contains a source that was not returned by search.');
  }

  const sourceUrls = new Set(sources.map((source) => source.url));
  const facts = new Map<string, AnalysisReport['facts'][number]>();
  const supportedReferences = new Set<string>();

  for (const fact of report.facts) {
    if (facts.has(fact.id)) throw new TypeError('Analysis report contains duplicate fact IDs.');

    if (fact.source.type === 'metric') {
      if (!WorkflowUtil.validMetricReference(fact.source.reference, metrics)) {
        throw new TypeError('Analysis report references an unavailable metric.');
      }
    } else if (!sourceUrls.has(fact.source.reference)) {
      throw new TypeError('Analysis report references an unknown research source.');
    }

    facts.set(fact.id, fact);

    supportedReferences.add(fact.id);
  }

  for (const inference of report.inferences) {
    if (supportedReferences.has(inference.id)) {
      throw new TypeError('Analysis report contains duplicate evidence IDs.');
    }

    if (inference.evidenceReferences.some((reference) => !supportedReferences.has(reference))) {
      throw new TypeError('Analysis inference references unsupported evidence.');
    }

    supportedReferences.add(inference.id);
  }

  for (const recommendation of report.recommendations) {
    if (supportedReferences.has(recommendation.id)) {
      throw new TypeError('Analysis report contains duplicate recommendation IDs.');
    }

    const verifyRecommendation = recommendation.evidenceReferences.some(
      (reference) => !supportedReferences.has(reference),
    );

    if (verifyRecommendation) {
      throw new TypeError('Analysis recommendation references unsupported evidence.');
    }

    supportedReferences.add(recommendation.id);
  }

  return report;
}

async function failStage(
  holder: CheckpointLeaseHolder,
  stage: 'research' | 'generation' | 'validation' | 'persist',
  error: unknown,
  now: Date,
): Promise<void> {
  const timedOut = error instanceof WorkflowUtilStageTimeoutError;

  const code =
    error instanceof WorkflowUtilStageError
      ? error.code
      : timedOut
        ? 'deadline_exceeded'
        : 'stage_unavailable';

  const errorMessage =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : String(error);

  logger.error('ai_growth_analysis.stage_failed', {
    stage,
    errorCode: code,
    timedOut,
    error: errorMessage,
  });

  await recordFailure(holder, stage, code, timedOut ? { status: 'timed_out' } : {}, now);
}

export async function continueGrowthAnalysis(
  holder: CheckpointLeaseHolder,
  execution: AnalysisExecutionDocument,
  rawMetrics: AggregatedMetrics,
  overrides: Partial<GrowthWorkflowDependencies> = {},
): Promise<'processed' | 'fenced'> {
  const deps = { ...WorkflowUtil.defaultDependencies, ...overrides };
  const metrics = aggregatedMetricsSchema.parse(rawMetrics);
  const goal = WorkflowUtil.sanitizeGoal(execution.request.goal);

  let currentStage: 'research' | 'generation' | 'validation' | 'persist' = 'research';

  try {
    const researchHash = CheckpointUtil.stageHash('research', {
      goal,
      required: WorkflowUtil.isMarketResearchRequired(goal),
    });

    const researchBegin = await beginStage(holder, 'research', researchHash, deps.now());

    if (researchBegin.state === 'fenced' || researchBegin.state === 'deadline') return 'fenced';

    if (researchBegin.state === 'attempt_limit') {
      throw new WorkflowUtilStageError('research', 'stage_unavailable');
    }

    if (researchBegin.state === 'incompatible') {
      throw new WorkflowUtilStageError('research', 'checkpoint_incompatible');
    }

    let sources: TavilyResearchSource[] = [];

    if (researchBegin.state === 'reused') {
      sources = reportSourcesSchema.parse(researchBegin.output);
    } else {
      if (WorkflowUtil.isMarketResearchRequired(goal)) {
        const currentSourceTimeout = await withTimeout(
          deps.search(goal),
          stageBudgetMs('research', execution.deadlineAt, deps.now()),
        );

        sources = currentSourceTimeout ?? [];
      }

      sources = reportSourcesSchema.parse(sources);

      const checkpoint = await saveStageCheckpoint(
        holder,
        'research',
        researchHash,
        sources,
        deps.now(),
      );

      if (checkpoint === 'fenced') {
        return 'fenced';
      }
    }

    currentStage = 'generation';

    const generationInput: InsightsInput = {
      goal,
      metrics,
      sources,
      period: execution.request.period,
    };

    const generationHash = CheckpointUtil.stageHash('generation', generationInput);

    const generationBegin = await beginStage(holder, 'generation', generationHash, deps.now());

    if (generationBegin.state === 'fenced' || generationBegin.state === 'deadline') return 'fenced';

    if (generationBegin.state === 'attempt_limit') {
      throw new WorkflowUtilStageError('generation', 'stage_unavailable');
    }

    if (generationBegin.state === 'incompatible') {
      throw new WorkflowUtilStageError('generation', 'checkpoint_incompatible');
    }

    let generated: LlmGeneratedAnalysis;

    if (generationBegin.state === 'reused') {
      generated = {
        report: reportSchema.parse(generationBegin.output),
        usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      };
    } else {
      const controller = new AbortController();

      generated = await withTimeout(
        deps.generate(generationInput, controller.signal),
        stageBudgetMs('generation', execution.deadlineAt, deps.now()),
        () => controller.abort(),
      );

      generated = {
        report: reportSchema.parse(generated.report),
        usage: generated.usage,
      };

      const stageCheckoutStatusSaved = await saveStageCheckpoint(
        holder,
        'generation',
        generationHash,
        generated.report,
        deps.now(),
      );

      if (stageCheckoutStatusSaved === 'fenced') {
        return 'fenced';
      }
    }

    currentStage = 'validation';

    const validationHash = CheckpointUtil.stageHash('validation', {
      report: generated.report,
      metrics,
      sources,
      period: execution.request.period,
    });

    const validationBegin = await beginStage(holder, 'validation', validationHash, deps.now());

    if (validationBegin.state === 'fenced' || validationBegin.state === 'deadline') return 'fenced';

    if (validationBegin.state === 'attempt_limit') {
      throw new WorkflowUtilStageError('validation', 'stage_unavailable');
    }

    if (validationBegin.state === 'incompatible') {
      throw new WorkflowUtilStageError('validation', 'checkpoint_incompatible');
    }

    const report =
      validationBegin.state === 'reused'
        ? generated.report
        : validateEvidence(generated.report, metrics, sources, execution);

    const stageCheckout = await saveStageCheckpoint(
      holder,
      'validation',
      validationHash,
      true,
      deps.now(),
    );

    if (validationBegin.state === 'started' && stageCheckout === 'fenced') {
      return 'fenced';
    }

    currentStage = 'persist';

    const persistHash = CheckpointUtil.stageHash('persist', report);

    const persisted = await completeAnalysis(
      holder,
      persistHash,
      report,
      generated.usage,
      deps.now(),
    );

    return persisted === 'completed' ? 'processed' : 'fenced';
  } catch (error: unknown) {
    await failStage(holder, currentStage, error, deps.now());
    return 'processed';
  }
}
