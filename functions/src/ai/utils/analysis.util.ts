import { randomUUID } from 'node:crypto';

export class AnalysisUtil {
  public static readonly dayMs: number = 86400000;

  public static readonly controlCharacters: RegExp =
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

  public static readonly defaultModel: string = 'openrouter/openai/gpt-4o';

  public static readonly analysisRuntimeLimits = {
    deadlineMs: 420000,
    workerTimeoutSeconds: 540,
    maxWorkerInvocations: 3,
    maxStageAttempts: 3,
    leaseMs: 90000,
    maxActiveExecutionsPerTenant: 1,
    stageBudgetMs: { metrics: 30000, research: 20000, generation: 60000 },
    maxResearchResults: 3,
    maxResearchQueryLength: 250,
    maxGeneratedTokens: 1024,
  };

  public static readonly limit = {
    goalMinLength: 10,
    goalMaxLength: 500,
    maxPeriodDays: 366,
    minPeriodStart: '2000-01-01',
    idempotencyKeyPattern: /^[A-Za-z0-9_-]{16,128}$/,
  };

  public static newOwner(): string {
    return randomUUID();
  }

  public static toDay(value: string): number {
    return Date.parse(`${value}T00:00:00.000Z`);
  }
}

export class AnalysisUtilIdempotencyConflictError extends Error {
  constructor() {
    super('idempotency_conflict');
  }
}

export class ActiveUtilAnalysisError extends Error {
  constructor() {
    super('active_analysis_exists');
  }
}
