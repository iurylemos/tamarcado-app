export interface CheckpointLeaseHolder {
  executionId: string;
  owner: string;
  fencingToken: number;
}

export type CheckpointBeginStageResult =
  | { state: 'started'; attemptCount: number }
  | { state: 'reused'; output: unknown }
  | { state: 'fenced' | 'attempt_limit' | 'deadline' | 'incompatible' };
