import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../config/collections';
import {
  ActiveUtilAnalysisError,
  AnalysisUtil,
  AnalysisUtilIdempotencyConflictError,
} from '../utils/analysis.util';
import { firestore } from '../../services/firestore.service';
import {
  type AnalysisStage,
  type AnalysisExecutionDocument,
  type StageErrorCode,
  isTerminalExecutionStatus,
} from '../../model/ai-analysis.model';
import type {
  CreatedExecution,
  CreateExecutionInput,
} from '../interfaces/create-execution.interface';
import type { ClaimResult } from '../interfaces/claim.interface';
import type {
  CheckpointBeginStageResult,
  CheckpointLeaseHolder,
} from '../interfaces/checkpoint.interface';
import { aggregatedMetricsSchema } from '../schemas/metrics.schema';
import { reportSchema, reportSourcesSchema, type AnalysisReport } from '../schemas/report.schema';
import { computeDeadline, isPastDeadline } from './limits.service';
import { CheckpointUtil } from '../utils/checkpoint.util';

function executions() {
  return firestore.collection(collections.aiAnalysisExecutions);
}

// Idempotency key is scoped to tenant and actor; the stored key is only a hash.
export async function createQueuedExecution(
  input: CreateExecutionInput,
  now: Date = new Date(),
): Promise<CreatedExecution> {
  const idempotencyKeyHash = CheckpointUtil.sha256(
    CheckpointUtil.canonicalJson({
      tenantId: input.tenantId,
      uid: input.requesterUid,
      key: input.idempotencyKey,
    }),
  );

  const requestHash = CheckpointUtil.sha256(CheckpointUtil.canonicalJson(input.request));

  return await firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(
      executions().where('idempotencyKeyHash', '==', idempotencyKeyHash).limit(1),
    );

    const found = existing.docs[0];

    if (found) {
      const data = found.data() as AnalysisExecutionDocument;

      if (data.tenantId !== input.tenantId || data.requestHash !== requestHash) {
        throw new AnalysisUtilIdempotencyConflictError();
      }

      return {
        executionId: found.id,
        status: data.status,
        createdAt: data.createdAt,
        created: false,
      };
    }

    const [queued, running] = await Promise.all([
      transaction.get(
        executions()
          .where('tenantId', '==', input.tenantId)
          .where('status', '==', 'queued')
          .limit(10),
      ),
      transaction.get(
        executions()
          .where('tenantId', '==', input.tenantId)
          .where('status', '==', 'running')
          .limit(10),
      ),
    ]);

    const active = [...queued.docs, ...running.docs].filter((document) => {
      const data = document.data() as AnalysisExecutionDocument;
      return !isPastDeadline(data.deadlineAt, now);
    });

    if (active.length >= AnalysisUtil.analysisRuntimeLimits.maxActiveExecutionsPerTenant) {
      throw new ActiveUtilAnalysisError();
    }

    const ref = executions().doc();

    const createdAt = Timestamp.fromDate(now);

    const document: AnalysisExecutionDocument = {
      tenantId: input.tenantId,
      requesterUid: input.requesterUid,
      idempotencyKeyHash,
      requestHash,
      request: input.request,
      status: 'queued',
      workerInvocationCount: 0,
      workflowRunId: CheckpointUtil.randomUUID(),
      correlationId: CheckpointUtil.randomUUID(),
      fencingToken: 0,
      activeStage: 'metrics',
      stages: {},
      createdAt,
      deadlineAt: computeDeadline(now),
    };

    transaction.create(ref, document);

    return { executionId: ref.id, status: 'queued', createdAt, created: true };
  });
}

export async function claimExecution(
  executionId: string,
  owner: string,
  now: Date = new Date(),
): Promise<ClaimResult> {
  const ref = executions().doc(executionId);
  return await firestore.runTransaction(async (transaction): Promise<ClaimResult> => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) return { state: 'missing' };

    const execution = snapshot.data() as AnalysisExecutionDocument;

    if (isTerminalExecutionStatus(execution.status)) return { state: 'terminal' };

    if (isPastDeadline(execution.deadlineAt, now)) {
      transaction.update(
        ref,
        CheckpointUtil.terminalUpdate('timed_out', 'deadline_exceeded', execution, now),
      );

      return { state: 'deadline' };
    }

    if (execution.lease && execution.lease.expiresAt.toMillis() > now.getTime()) {
      return { state: 'leased' };
    }

    const checkNeedUpdate =
      execution.workerInvocationCount >= AnalysisUtil.analysisRuntimeLimits.maxWorkerInvocations;

    if (checkNeedUpdate) {
      transaction.update(
        ref,
        CheckpointUtil.terminalUpdate('failed', 'invocation_limit_exceeded', execution, now),
      );
      return { state: 'invocation_limit' };
    }

    const fencingToken = execution.fencingToken + 1;

    transaction.update(ref, {
      status: 'running',
      workerInvocationCount: execution.workerInvocationCount + 1,
      fencingToken,
      lease: CheckpointUtil.leaseFor(owner, fencingToken, now),
      ...(execution.startedAt ? {} : { startedAt: Timestamp.fromDate(now) }),
    });

    return {
      state: 'claimed',
      fencingToken,
      execution: { ...execution, status: 'running', fencingToken },
    };
  });
}

// The attempt counter is persisted before the stage runs so a crash cannot hide an attempt.
export async function beginStage(
  holder: CheckpointLeaseHolder,
  stage: AnalysisStage,
  inputHash: string,
  now: Date = new Date(),
): Promise<CheckpointBeginStageResult> {
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(
    async (transaction): Promise<CheckpointBeginStageResult> => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) return { state: 'fenced' };

      const execution = snapshot.data() as AnalysisExecutionDocument;

      if (!CheckpointUtil.holdsLease(execution, holder.owner, holder.fencingToken, now)) {
        return { state: 'fenced' };
      }

      if (isPastDeadline(execution.deadlineAt, now)) {
        transaction.update(
          ref,
          CheckpointUtil.terminalUpdate('timed_out', 'deadline_exceeded', execution, now),
        );

        return { state: 'deadline' };
      }

      const checkpoint = execution.stages[stage];

      if (checkpoint?.status === 'succeeded') {
        if (checkpoint.inputHash !== inputHash || !checkpoint.output) {
          return { state: 'incompatible' };
        }

        return { state: 'reused', output: checkpoint.output };
      }

      const attemptCount = checkpoint?.attemptCount ?? 0;

      if (attemptCount >= AnalysisUtil.analysisRuntimeLimits.maxStageAttempts) {
        return { state: 'attempt_limit' };
      }

      transaction.update(ref, {
        activeStage: stage,
        [`stages.${stage}.status`]: 'running',
        [`stages.${stage}.attemptCount`]: attemptCount + 1,
        [`stages.${stage}.inputHash`]: inputHash,
        [`stages.${stage}.startedAt`]: Timestamp.fromDate(now),
        lease: CheckpointUtil.leaseFor(holder.owner, holder.fencingToken, now),
      });

      return { state: 'started', attemptCount: attemptCount + 1 };
    },
  );
}

export async function saveStageCheckpoint(
  holder: CheckpointLeaseHolder,
  stage: AnalysisStage,
  inputHash: string,
  rawOutput: unknown,
  now: Date = new Date(),
): Promise<'saved' | 'fenced'> {
  const output = validateStageOutput(stage, rawOutput);
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(async (transaction): Promise<'saved' | 'fenced'> => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) return 'fenced';

    const execution = snapshot.data() as AnalysisExecutionDocument;

    if (!CheckpointUtil.holdsLease(execution, holder.owner, holder.fencingToken, now))
      return 'fenced';

    transaction.update(ref, {
      [`stages.${stage}.status`]: 'succeeded',
      [`stages.${stage}.inputHash`]: inputHash,
      [`stages.${stage}.output`]: output,
      [`stages.${stage}.completedAt`]: Timestamp.fromDate(now),
      ...(stage === 'metrics' ? { metrics: output } : {}),
      ...(stage === 'research' ? { researchSources: output } : {}),
      lease: CheckpointUtil.leaseFor(holder.owner, holder.fencingToken, now),
    });
    return 'saved';
  });
}

function validateStageOutput(stage: AnalysisStage, output: unknown): unknown {
  switch (stage) {
    case 'metrics':
      return aggregatedMetricsSchema.parse(output);
    case 'research':
      return reportSourcesSchema.parse(output);
    case 'generation':
      return reportSchema.parse(output);
    case 'validation':
      if (output !== true) throw new TypeError('Analysis validation checkpoint must be true.');
      return true;
    case 'persist':
      throw new TypeError('Use completeAnalysis to persist the final report.');
  }
}

export async function completeAnalysis(
  holder: CheckpointLeaseHolder,
  inputHash: string,
  rawReport: unknown,
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  },
  now: Date = new Date(),
): Promise<'completed' | 'fenced' | 'deadline'> {
  const report: AnalysisReport = reportSchema.parse(rawReport);
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) return 'fenced';

    const execution = snapshot.data() as AnalysisExecutionDocument;

    if (!CheckpointUtil.holdsLease(execution, holder.owner, holder.fencingToken, now))
      return 'fenced';

    if (isPastDeadline(execution.deadlineAt, now)) {
      transaction.update(
        ref,
        CheckpointUtil.terminalUpdate('timed_out', 'deadline_exceeded', execution, now),
      );
      return 'deadline';
    }

    transaction.update(ref, {
      status: 'succeeded',
      completedAt: Timestamp.fromDate(now),
      report,
      usage,
      activeStage: 'persist',
      [`stages.persist.status`]: 'succeeded',
      [`stages.persist.attemptCount`]: 1,
      [`stages.persist.inputHash`]: inputHash,
      [`stages.persist.output`]: true,
      [`stages.persist.startedAt`]: Timestamp.fromDate(now),
      [`stages.persist.completedAt`]: Timestamp.fromDate(now),
      lease: FieldValue.delete(),
    });
    return 'completed';
  });
}

export async function releaseLease(
  holder: CheckpointLeaseHolder,
  now: Date = new Date(),
): Promise<'released' | 'fenced'> {
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(async (transaction): Promise<'released' | 'fenced'> => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      return 'fenced';
    }

    const execution = snapshot.data() as AnalysisExecutionDocument;

    if (!CheckpointUtil.holdsLease(execution, holder.owner, holder.fencingToken, now)) {
      return 'fenced';
    }

    transaction.update(ref, { lease: FieldValue.delete() });

    return 'released';
  });
}

export async function recordFailure(
  holder: CheckpointLeaseHolder,
  stage: AnalysisStage,
  code: StageErrorCode,
  options: { status?: 'failed' | 'timed_out'; retryable?: boolean } = {},
  now: Date = new Date(),
): Promise<'recorded' | 'fenced'> {
  const ref = executions().doc(holder.executionId);

  return await firestore.runTransaction(async (transaction): Promise<'recorded' | 'fenced'> => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) return 'fenced';

    const execution = snapshot.data() as AnalysisExecutionDocument;

    if (!CheckpointUtil.holdsLease(execution, holder.owner, holder.fencingToken, now))
      return 'fenced';

    const status = options.status ?? 'failed';

    transaction.update(ref, {
      status,
      completedAt: Timestamp.fromDate(now),
      lease: FieldValue.delete(),
      [`stages.${stage}.status`]: status === 'timed_out' ? 'timed_out' : 'failed',
      [`stages.${stage}.errorCode`]: code,
      failure: { code, stage, retryable: options.retryable ?? false },
    });

    return 'recorded';
  });
}
