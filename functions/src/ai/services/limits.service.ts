import { Timestamp } from 'firebase-admin/firestore';

export const analysisRuntimeLimits = {
  deadlineMs: 420_000,
  workerTimeoutSeconds: 540,
  maxWorkerInvocations: 3,
  maxStageAttempts: 3,
  leaseMs: 90_000,
  maxActiveExecutionsPerTenant: 1,
  stageBudgetMs: { metrics: 30_000, research: 20_000, generation: 60_000 },
} as const;

export function computeDeadline(createdAt: Date): Timestamp {
  return Timestamp.fromMillis(createdAt.getTime() + analysisRuntimeLimits.deadlineMs);
}

export function isPastDeadline(deadlineAt: Timestamp, now: Date): boolean {
  return deadlineAt.toMillis() <= now.getTime();
}

// Budget never exceeds the stage cap or the time left before the global deadline.
export function stageBudgetMs(
  stage: keyof typeof analysisRuntimeLimits.stageBudgetMs,
  deadlineAt: Timestamp,
  now: Date,
): number {
  const remaining = deadlineAt.toMillis() - now.getTime();
  return Math.max(0, Math.min(analysisRuntimeLimits.stageBudgetMs[stage], remaining));
}
