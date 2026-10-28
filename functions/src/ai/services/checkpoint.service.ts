import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../config/collections';
import { firestore } from '../../services/firestore.service';
import {
  type AggregatedMetrics,
  type AnalysisExecutionDocument,
  type AnalysisRequestSnapshot,
  type AnalysisStage,
  type StageErrorCode,
  isTerminalExecutionStatus,
} from '../../model/ai-analysis.model';
import { analysisRuntimeLimits, computeDeadline, isPastDeadline } from './limits.service';

export class AnalysisIdempotencyConflictError extends Error {
  constructor() {
    super('idempotency_conflict');
  }
}

export class ActiveAnalysisError extends Error {
  constructor() {
    super('active_analysis_exists');
  }
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function executions() {
  return firestore.collection(collections.aiAnalysisExecutions);
}

export interface CreateExecutionInput {
  tenantId: string;
  requesterUid: string;
  idempotencyKey: string;
  request: AnalysisRequestSnapshot;
}

export interface CreatedExecution {
  executionId: string;
  status: AnalysisExecutionDocument['status'];
  createdAt: Timestamp;
  created: boolean;
}

// Idempotency key is scoped to tenant and actor; the stored key is only a hash.
export async function createQueuedExecution(
  input: CreateExecutionInput,
  now: Date = new Date(),
): Promise<CreatedExecution> {
  const idempotencyKeyHash = sha256(
    canonicalJson({ tenantId: input.tenantId, uid: input.requesterUid, key: input.idempotencyKey }),
  );
  const requestHash = sha256(canonicalJson(input.request));

  return await firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(
      executions().where('idempotencyKeyHash', '==', idempotencyKeyHash).limit(1),
    );
    const found = existing.docs[0];
    if (found) {
      const data = found.data() as AnalysisExecutionDocument;
      if (data.tenantId !== input.tenantId || data.requestHash !== requestHash) {
        throw new AnalysisIdempotencyConflictError();
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
    if (active.length >= analysisRuntimeLimits.maxActiveExecutionsPerTenant) {
      throw new ActiveAnalysisError();
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
      workflowRunId: randomUUID(),
      correlationId: randomUUID(),
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

export type ClaimResult =
  | { state: 'missing' | 'terminal' | 'deadline' | 'leased' | 'invocation_limit' }
  | { state: 'claimed'; fencingToken: number; execution: AnalysisExecutionDocument };

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
      transaction.update(ref, terminalUpdate('timed_out', 'deadline_exceeded', execution, now));
      return { state: 'deadline' };
    }
    if (execution.lease && execution.lease.expiresAt.toMillis() > now.getTime()) {
      return { state: 'leased' };
    }
    if (execution.workerInvocationCount >= analysisRuntimeLimits.maxWorkerInvocations) {
      transaction.update(
        ref,
        terminalUpdate('failed', 'invocation_limit_exceeded', execution, now),
      );
      return { state: 'invocation_limit' };
    }

    const fencingToken = execution.fencingToken + 1;
    transaction.update(ref, {
      status: 'running',
      workerInvocationCount: execution.workerInvocationCount + 1,
      fencingToken,
      lease: leaseFor(owner, fencingToken, now),
      ...(execution.startedAt ? {} : { startedAt: Timestamp.fromDate(now) }),
    });
    return {
      state: 'claimed',
      fencingToken,
      execution: { ...execution, status: 'running', fencingToken },
    };
  });
}

function leaseFor(owner: string, fencingToken: number, now: Date) {
  return {
    owner,
    fencingToken,
    expiresAt: Timestamp.fromMillis(now.getTime() + analysisRuntimeLimits.leaseMs),
  };
}

function terminalUpdate(
  status: 'failed' | 'timed_out',
  code: StageErrorCode,
  execution: AnalysisExecutionDocument,
  now: Date,
) {
  return {
    status,
    completedAt: Timestamp.fromDate(now),
    lease: FieldValue.delete(),
    failure: {
      code,
      stage: execution.activeStage,
      retryable: false,
    },
  };
}

function holdsLease(
  execution: AnalysisExecutionDocument,
  owner: string,
  fencingToken: number,
  now: Date,
): boolean {
  return (
    execution.status === 'running' &&
    execution.fencingToken === fencingToken &&
    execution.lease?.owner === owner &&
    execution.lease.fencingToken === fencingToken &&
    execution.lease.expiresAt.toMillis() > now.getTime()
  );
}

export interface LeaseHolder {
  executionId: string;
  owner: string;
  fencingToken: number;
}

export type BeginStageResult =
  | { state: 'started'; attemptCount: number }
  | { state: 'reused'; output: AggregatedMetrics }
  | { state: 'fenced' | 'attempt_limit' | 'deadline' | 'incompatible' };

// The attempt counter is persisted before the stage runs so a crash cannot hide an attempt.
export async function beginStage(
  holder: LeaseHolder,
  stage: AnalysisStage,
  inputHash: string,
  now: Date = new Date(),
): Promise<BeginStageResult> {
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(async (transaction): Promise<BeginStageResult> => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { state: 'fenced' };
    const execution = snapshot.data() as AnalysisExecutionDocument;
    if (!holdsLease(execution, holder.owner, holder.fencingToken, now)) return { state: 'fenced' };
    if (isPastDeadline(execution.deadlineAt, now)) {
      transaction.update(ref, terminalUpdate('timed_out', 'deadline_exceeded', execution, now));
      return { state: 'deadline' };
    }

    const checkpoint = execution.stages[stage];
    if (checkpoint?.status === 'succeeded') {
      if (checkpoint.inputHash !== inputHash || !checkpoint.output)
        return { state: 'incompatible' };
      return { state: 'reused', output: checkpoint.output };
    }
    const attemptCount = checkpoint?.attemptCount ?? 0;
    if (attemptCount >= analysisRuntimeLimits.maxStageAttempts) return { state: 'attempt_limit' };

    transaction.update(ref, {
      activeStage: stage,
      [`stages.${stage}.status`]: 'running',
      [`stages.${stage}.attemptCount`]: attemptCount + 1,
      [`stages.${stage}.inputHash`]: inputHash,
      [`stages.${stage}.startedAt`]: Timestamp.fromDate(now),
      lease: leaseFor(holder.owner, holder.fencingToken, now),
    });
    return { state: 'started', attemptCount: attemptCount + 1 };
  });
}

export async function saveStageCheckpoint(
  holder: LeaseHolder,
  stage: AnalysisStage,
  inputHash: string,
  output: AggregatedMetrics,
  now: Date = new Date(),
): Promise<'saved' | 'fenced'> {
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(async (transaction): Promise<'saved' | 'fenced'> => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return 'fenced';
    const execution = snapshot.data() as AnalysisExecutionDocument;
    if (!holdsLease(execution, holder.owner, holder.fencingToken, now)) return 'fenced';

    transaction.update(ref, {
      [`stages.${stage}.status`]: 'succeeded',
      [`stages.${stage}.inputHash`]: inputHash,
      [`stages.${stage}.output`]: output,
      [`stages.${stage}.completedAt`]: Timestamp.fromDate(now),
      metrics: output,
      lease: leaseFor(holder.owner, holder.fencingToken, now),
    });
    return 'saved';
  });
}

export async function releaseLease(
  holder: LeaseHolder,
  now: Date = new Date(),
): Promise<'released' | 'fenced'> {
  const ref = executions().doc(holder.executionId);
  return await firestore.runTransaction(async (transaction): Promise<'released' | 'fenced'> => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return 'fenced';
    const execution = snapshot.data() as AnalysisExecutionDocument;
    if (!holdsLease(execution, holder.owner, holder.fencingToken, now)) return 'fenced';
    transaction.update(ref, { lease: FieldValue.delete() });
    return 'released';
  });
}

export async function recordFailure(
  holder: LeaseHolder,
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
    if (!holdsLease(execution, holder.owner, holder.fencingToken, now)) return 'fenced';

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
