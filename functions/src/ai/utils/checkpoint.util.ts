import { createHash, randomUUID } from 'node:crypto';
import { AnalysisExecutionDocument, StageErrorCode } from '../../model/ai-analysis.model';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { AnalysisUtil } from './analysis.util';

export class CheckpointUtil {
  public static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  public static getEntries(value: unknown): [string, unknown][] {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

    return entries;
  }

  public static canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalJson(item)).join(',')}]`;
    }

    if (typeof value === 'object' && value !== null) {
      const entries = this.getEntries(value);

      return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${this.canonicalJson(item)}`).join(',')}}`;
    }

    return JSON.stringify(value);
  }

  public static randomUUID(): string {
    return randomUUID();
  }

  public static stageHash(stage: string, value: unknown): string {
    return this.sha256(this.canonicalJson({ stage, value }));
  }

  public static leaseFor(owner: string, fencingToken: number, now: Date) {
    return {
      owner,
      fencingToken,
      expiresAt: Timestamp.fromMillis(now.getTime() + AnalysisUtil.analysisRuntimeLimits.leaseMs),
    };
  }

  public static terminalUpdate(
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

  public static holdsLease(
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

  public static metricsInputHash(execution: AnalysisExecutionDocument): string {
    return this.sha256(
      this.canonicalJson({
        schemaVersion: execution.request.schemaVersion,
        tenantId: execution.tenantId,
        period: execution.request.period,
        timezone: execution.request.timezone,
      }),
    );
  }
}
