import { Timestamp } from 'firebase-admin/firestore';
import { AnalysisUtil } from '../utils/analysis.util';

export function computeDeadline(createdAt: Date): Timestamp {
  return Timestamp.fromMillis(createdAt.getTime() + AnalysisUtil.analysisRuntimeLimits.deadlineMs);
}

export function isPastDeadline(deadlineAt: Timestamp, now: Date): boolean {
  return deadlineAt.toMillis() <= now.getTime();
}

// Budget never exceeds the stage cap or the time left before the global deadline.
export function stageBudgetMs(
  stage: keyof typeof AnalysisUtil.analysisRuntimeLimits.stageBudgetMs,
  deadlineAt: Timestamp,
  now: Date,
): number {
  const remaining = deadlineAt.toMillis() - now.getTime();
  return Math.max(0, Math.min(AnalysisUtil.analysisRuntimeLimits.stageBudgetMs[stage], remaining));
}
