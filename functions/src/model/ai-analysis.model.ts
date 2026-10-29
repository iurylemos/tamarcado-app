import type { Timestamp } from 'firebase-admin/firestore';

export const analysisSchemaVersion = 1;

export const executionStatuses = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'timed_out',
  'cancelled',
] as const;
export type ExecutionStatus = (typeof executionStatuses)[number];

export const terminalExecutionStatuses = ['succeeded', 'failed', 'timed_out', 'cancelled'] as const;

export const analysisStages = [
  'metrics',
  'research',
  'generation',
  'validation',
  'persist',
] as const;
export type AnalysisStage = (typeof analysisStages)[number];

export const stageStatuses = ['pending', 'running', 'succeeded', 'failed', 'timed_out'] as const;
export type StageStatus = (typeof stageStatuses)[number];

export const proposalStatuses = ['draft', 'pending_approval', 'approved', 'rejected'] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

export const stageErrorCodes = [
  'metrics_limit_exceeded',
  'metrics_unavailable',
  'attempt_limit_exceeded',
  'invocation_limit_exceeded',
  'deadline_exceeded',
  'checkpoint_incompatible',
  'invalid_execution',
  'stage_unavailable',
  'internal_error',
] as const;
export type StageErrorCode = (typeof stageErrorCodes)[number];

const allowedExecutionTransitions: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  queued: ['running', 'failed', 'timed_out', 'cancelled'],
  running: ['succeeded', 'failed', 'timed_out', 'cancelled'],
  succeeded: [],
  failed: [],
  timed_out: [],
  cancelled: [],
};

export function canTransitionExecution(current: ExecutionStatus, next: ExecutionStatus): boolean {
  return allowedExecutionTransitions[current].includes(next);
}

export function isTerminalExecutionStatus(status: ExecutionStatus): boolean {
  return allowedExecutionTransitions[status].length === 0;
}

export interface AnalysisRequestSnapshot {
  schemaVersion: number;
  goal: string;
  period: { start: string; endExclusive: string };
  timezone: string;
}

export type MetricAvailability<T> =
  { available: true; value: T } | { available: false; limitation: string };

export interface AggregatedMetrics {
  schemaVersion: number;
  period: { start: string; endExclusive: string; timezone: string };
  coverage: 'sufficient' | 'no_data';
  appointmentCount: number;
  statusCounts: Record<'pending' | 'confirmed' | 'cancelled' | 'completed', number>;
  completedSalesCents: MetricAvailability<number>;
  completedCommissionCents: MetricAvailability<number>;
  occupancy: MetricAvailability<number>;
  periodComparison: MetricAvailability<number>;
}

export interface StageCheckpoint {
  status: StageStatus;
  attemptCount: number;
  inputHash?: string;
  output?: unknown;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  errorCode?: StageErrorCode;
}

export interface ExecutionLease {
  owner: string;
  expiresAt: Timestamp;
  fencingToken: number;
}

export interface AnalysisExecutionDocument {
  tenantId: string;
  requesterUid: string;
  idempotencyKeyHash: string;
  requestHash: string;
  request: AnalysisRequestSnapshot;
  status: ExecutionStatus;
  workerInvocationCount: number;
  workflowRunId: string;
  correlationId: string;
  lease?: ExecutionLease;
  fencingToken: number;
  activeStage: AnalysisStage;
  stages: Partial<Record<AnalysisStage, StageCheckpoint>>;
  metrics?: AggregatedMetrics;
  researchSources?: Array<{ title: string; url: string; snippet: string }>;
  report?: {
    schemaVersion: number;
    period: { start: string; endExclusive: string };
    summary: string;
    facts: Array<{
      id: string;
      statement: string;
      source: { type: 'metric' | 'web'; reference: string };
    }>;
    inferences: Array<{
      id: string;
      statement: string;
      evidenceReferences: string[];
      uncertainty: string;
    }>;
    recommendations: Array<{
      id: string;
      title: string;
      rationale: string;
      priority: 'low' | 'medium' | 'high';
      evidenceReferences: string[];
    }>;
    limitations: string[];
    sources: Array<{ title: string; url: string; snippet: string }>;
  };
  usage?: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  failure?: { code: StageErrorCode; stage: AnalysisStage; retryable: boolean };
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  deadlineAt: Timestamp;
}

export interface AnalysisProposalDocument {
  tenantId: string;
  executionId: string;
  proposalVersion: number;
  canonicalPayload: Record<string, unknown>;
  proposalHash: string;
  status: ProposalStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
