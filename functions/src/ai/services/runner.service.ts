import { logger } from 'firebase-functions';
import type { AggregatedMetrics } from '../../model/ai-analysis.model';
import type { RunnerDependencies, RunnerOutcome } from '../interfaces/runner.interface';
import type { CheckpointLeaseHolder } from '../interfaces/checkpoint.interface';
import { CheckpointUtil } from '../utils/checkpoint.util';
import { getAggregatedMetrics } from '../tools/authorized-metrics.tool';
import { continueGrowthAnalysis } from '../workflows/growth-analysis.workflow';
import { aggregatedMetricsSchema } from '../schemas/metrics.schema';
import {
  beginStage,
  claimExecution,
  recordFailure,
  releaseLease,
  saveStageCheckpoint,
} from './checkpoint.service';
import { stageBudgetMs } from './limits.service';
import { AnalysisUtil } from '../utils/analysis.util';
import { WorkflowUtil, WorkflowUtilStageTimeoutError } from '../utils/workflow.util';
import { MetricsUtilLimitExceededError, MetricsUtilUnavailableError } from '../utils/metrics.util';

async function withTimeout<T>(work: Promise<T>, budgetMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new WorkflowUtilStageTimeoutError()), budgetMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// The runner owns deterministic orchestration; providers only execute their assigned stage.
export async function runAnalysis(
  executionId: string,
  overrides?: Partial<RunnerDependencies>,
): Promise<RunnerOutcome> {
  const deps = { ...WorkflowUtil.defaultDependencies, ...overrides };

  const owner = AnalysisUtil.newOwner();

  const claim = await claimExecution(executionId, owner, deps.now());

  if (claim.state === 'leased') return 'leased';

  if (claim.state !== 'claimed') return 'skipped';

  const holder: CheckpointLeaseHolder = { executionId, owner, fencingToken: claim.fencingToken };

  const inputHash = CheckpointUtil.metricsInputHash(claim.execution);

  const begin = await beginStage(holder, 'metrics', inputHash, deps.now());

  if (begin.state === 'fenced' || begin.state === 'deadline') return 'fenced';

  if (begin.state === 'incompatible') {
    await recordFailure(holder, 'metrics', 'checkpoint_incompatible', {}, deps.now());
    return 'processed';
  }

  if (begin.state === 'attempt_limit') {
    await recordFailure(holder, 'metrics', 'attempt_limit_exceeded', {}, deps.now());
    return 'processed';
  }

  let metrics: AggregatedMetrics;

  if (begin.state === 'reused') {
    metrics = aggregatedMetricsSchema.parse(begin.output);
  } else if (begin.state === 'started') {
    const budget = stageBudgetMs('metrics', claim.execution.deadlineAt, deps.now());

    const metricsPromise = getAggregatedMetrics(executionId);

    try {
      metrics = await withTimeout(metricsPromise, budget);

      const checkpointResult = await saveStageCheckpoint(
        holder,
        'metrics',
        inputHash,
        metrics,
        deps.now(),
      );

      if (checkpointResult === 'fenced') {
        return 'fenced';
      }
    } catch (error: unknown) {
      if (error instanceof MetricsUtilLimitExceededError) {
        await recordFailure(holder, 'metrics', 'metrics_limit_exceeded', {}, deps.now());
        return 'processed';
      }

      if (error instanceof MetricsUtilUnavailableError) {
        await recordFailure(holder, 'metrics', 'metrics_unavailable', {}, deps.now());
        return 'processed';
      }

      logger.error('ai_analysis.stage_failed', {
        stage: 'metrics',
        correlationId: claim.execution.correlationId,
        attempt: begin.attemptCount,
        timedOut: error,
      });

      await releaseLease(holder, deps.now());

      return 'retry';
    }
  } else {
    return 'fenced';
  }

  return await continueGrowthAnalysis(holder, claim.execution, metrics, deps);
}
