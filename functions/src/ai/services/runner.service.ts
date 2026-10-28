import { randomUUID } from 'node:crypto';
import { logger } from 'firebase-functions';
import type { AggregatedMetrics, AnalysisExecutionDocument } from '../../model/ai-analysis.model';
import {
  MetricsLimitExceededError,
  MetricsUnavailableError,
  getAggregatedMetrics,
} from '../tools/authorized-metrics.tool';
import {
  beginStage,
  canonicalJson,
  claimExecution,
  recordFailure,
  releaseLease,
  saveStageCheckpoint,
  sha256,
  type LeaseHolder,
} from './checkpoint.service';
import { stageBudgetMs } from './limits.service';

export type RunOutcome = 'processed' | 'skipped' | 'fenced' | 'leased' | 'retry';

export interface RunnerDependencies {
  getMetrics: (executionId: string) => Promise<AggregatedMetrics>;
  now: () => Date;
  newOwner: () => string;
}

const defaultDependencies: RunnerDependencies = {
  getMetrics: getAggregatedMetrics,
  now: () => new Date(),
  newOwner: randomUUID,
};

class StageTimeoutError extends Error {}

async function withTimeout<T>(work: Promise<T>, budgetMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new StageTimeoutError()), budgetMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function metricsInputHash(execution: AnalysisExecutionDocument): string {
  return sha256(
    canonicalJson({
      schemaVersion: execution.request.schemaVersion,
      tenantId: execution.tenantId,
      period: execution.request.period,
      timezone: execution.request.timezone,
    }),
  );
}

// Deterministic runner: only the metrics stage exists in this delivery. Research,
// generation and validation stages are out of scope, so the run ends in an explicit
// terminal failure after the metrics checkpoint instead of fabricating a report.
export async function runAnalysis(
  executionId: string,
  overrides: Partial<RunnerDependencies> = {},
): Promise<RunOutcome> {
  const deps = { ...defaultDependencies, ...overrides };
  const owner = deps.newOwner();
  const claim = await claimExecution(executionId, owner, deps.now());

  if (claim.state === 'leased') return 'leased';
  if (claim.state !== 'claimed') return 'skipped';

  const holder: LeaseHolder = { executionId, owner, fencingToken: claim.fencingToken };
  const inputHash = metricsInputHash(claim.execution);
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

  if (begin.state === 'started') {
    const budget = stageBudgetMs('metrics', claim.execution.deadlineAt, deps.now());
    try {
      const metrics = await withTimeout(deps.getMetrics(executionId), budget);
      if (
        (await saveStageCheckpoint(holder, 'metrics', inputHash, metrics, deps.now())) === 'fenced'
      ) {
        return 'fenced';
      }
    } catch (error: unknown) {
      if (error instanceof MetricsLimitExceededError) {
        await recordFailure(holder, 'metrics', 'metrics_limit_exceeded', {}, deps.now());
        return 'processed';
      }
      if (error instanceof MetricsUnavailableError) {
        await recordFailure(holder, 'metrics', 'metrics_unavailable', {}, deps.now());
        return 'processed';
      }
      logger.warn('ai_analysis.stage_failed', {
        stage: 'metrics',
        correlationId: claim.execution.correlationId,
        attempt: begin.attemptCount,
        timedOut: error instanceof StageTimeoutError,
      });
      await releaseLease(holder, deps.now());
      return 'retry';
    }
  }

  await recordFailure(holder, 'research', 'stage_unavailable', {}, deps.now());
  return 'processed';
}
