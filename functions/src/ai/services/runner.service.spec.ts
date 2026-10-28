import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GCLOUD_PROJECT ??= 'demo-tamarcado';
});

import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../config/collections';
import type { AggregatedMetrics, AnalysisExecutionDocument } from '../../model/ai-analysis.model';
import { firestore } from '../../services/firestore.service';
import { assertLocalEmulator, emulatorAvailable } from '../../../test/ai-analysis-helpers';
import { MetricsLimitExceededError } from '../tools/authorized-metrics.tool';
import {
  beginStage,
  canonicalJson,
  claimExecution,
  createQueuedExecution,
  recordFailure,
  saveStageCheckpoint,
  sha256,
} from './checkpoint.service';
import { runAnalysis } from './runner.service';

const metrics: AggregatedMetrics = {
  schemaVersion: 1,
  period: { start: '2030-02-01', endExclusive: '2030-03-01', timezone: 'America/Sao_Paulo' },
  coverage: 'no_data',
  appointmentCount: 0,
  statusCounts: { pending: 0, confirmed: 0, cancelled: 0, completed: 0 },
  completedSalesCents: { available: false, limitation: 'Sem dados.' },
  completedCommissionCents: { available: false, limitation: 'Sem dados.' },
  occupancy: { available: false, limitation: 'Indisponível.' },
  periodComparison: { available: false, limitation: 'Indisponível.' },
};

const tenants: string[] = [];
const t0 = new Date('2030-02-01T12:00:00.000Z');
const at = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

async function newExecution() {
  const tenantId = `ai-runner-${crypto.randomUUID()}`;
  tenants.push(tenantId);
  const created = await createQueuedExecution(
    {
      tenantId,
      requesterUid: 'uid-1',
      idempotencyKey: crypto.randomUUID(),
      request: {
        schemaVersion: 1,
        goal: 'Entender vendas',
        period: { start: '2030-02-01', endExclusive: '2030-03-01' },
        timezone: 'America/Sao_Paulo',
      },
    },
    t0,
  );
  return created.executionId;
}

async function read(executionId: string) {
  const snapshot = await firestore
    .collection(collections.aiAnalysisExecutions)
    .doc(executionId)
    .get();
  return snapshot.data() as AnalysisExecutionDocument;
}

describe.skipIf(!emulatorAvailable)('analysis runner and checkpoints', () => {
  beforeAll(assertLocalEmulator);
  afterAll(async () => {
    for (const tenantId of tenants) {
      const snapshot = await firestore
        .collection(collections.aiAnalysisExecutions)
        .where('tenantId', '==', tenantId)
        .get();
      await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
    }
  });

  it('runs the metrics stage once, checkpoints it and ends in an explicit terminal state', async () => {
    const executionId = await newExecution();
    const getMetrics = vi.fn().mockResolvedValue(metrics);

    expect(await runAnalysis(executionId, { getMetrics, now: () => at(1) })).toBe('processed');

    const data = await read(executionId);
    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect(data.stages.metrics).toMatchObject({ status: 'succeeded', attemptCount: 1 });
    expect(data.metrics).toEqual(metrics);
    expect(data).toMatchObject({
      status: 'failed',
      workerInvocationCount: 1,
      failure: { code: 'stage_unavailable', retryable: false },
    });
    expect(data.lease).toBeUndefined();
    expect((data as unknown as Record<string, unknown>).report).toBeUndefined();
  });

  it('ignores redelivery of a terminal execution without repeating work', async () => {
    const executionId = await newExecution();
    const getMetrics = vi.fn().mockResolvedValue(metrics);
    await runAnalysis(executionId, { getMetrics, now: () => at(1) });

    expect(await runAnalysis(executionId, { getMetrics, now: () => at(2) })).toBe('skipped');
    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect((await read(executionId)).workerInvocationCount).toBe(1);
  });

  it('blocks concurrent workers with the lease', async () => {
    const executionId = await newExecution();
    const first = await claimExecution(executionId, 'owner-1', at(1));
    expect(first).toMatchObject({ state: 'claimed', fencingToken: 1 });

    expect(await claimExecution(executionId, 'owner-2', at(2))).toEqual({ state: 'leased' });
    expect((await read(executionId)).workerInvocationCount).toBe(1);

    const getMetrics = vi.fn().mockResolvedValue(metrics);
    expect(await runAnalysis(executionId, { getMetrics, now: () => at(3) })).toBe('leased');
    expect(getMetrics).not.toHaveBeenCalled();
  });

  it('fences a stale owner after the lease is taken over', async () => {
    const executionId = await newExecution();
    const stale = await claimExecution(executionId, 'owner-1', at(1));
    expect(stale.state).toBe('claimed');
    const takeover = await claimExecution(executionId, 'owner-2', at(200));
    expect(takeover).toMatchObject({ state: 'claimed', fencingToken: 2 });

    const staleHolder = { executionId, owner: 'owner-1', fencingToken: 1 };
    expect(await beginStage(staleHolder, 'metrics', 'hash', at(201))).toEqual({ state: 'fenced' });
    expect(await saveStageCheckpoint(staleHolder, 'metrics', 'hash', metrics, at(201))).toBe(
      'fenced',
    );
    expect(await recordFailure(staleHolder, 'metrics', 'internal_error', {}, at(201))).toBe(
      'fenced',
    );
    expect((await read(executionId)).status).toBe('running');
  });

  it('resumes from the checkpoint without repeating the metrics call', async () => {
    const executionId = await newExecution();
    const holderClaim = await claimExecution(executionId, 'owner-1', at(1));
    if (holderClaim.state !== 'claimed') throw new Error('claim failed');
    const holder = { executionId, owner: 'owner-1', fencingToken: holderClaim.fencingToken };
    const data = await read(executionId);
    const inputHash = sha256(
      canonicalJson({
        schemaVersion: 1,
        tenantId: data.tenantId,
        period: data.request.period,
        timezone: data.request.timezone,
      }),
    );
    await beginStage(holder, 'metrics', inputHash, at(2));
    await saveStageCheckpoint(holder, 'metrics', inputHash, metrics, at(3));

    const getMetrics = vi.fn().mockResolvedValue(metrics);
    expect(await runAnalysis(executionId, { getMetrics, now: () => at(200) })).toBe('processed');
    expect(getMetrics).not.toHaveBeenCalled();
    expect((await read(executionId)).stages.metrics?.attemptCount).toBe(1);
  });

  it('retries transient failures within the invocation cap, then fails terminally', async () => {
    const executionId = await newExecution();
    const getMetrics = vi.fn().mockRejectedValue(new Error('transient'));

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(await runAnalysis(executionId, { getMetrics, now: () => at(attempt * 10) })).toBe(
        'retry',
      );
    }
    expect(await runAnalysis(executionId, { getMetrics, now: () => at(100) })).toBe('skipped');

    const data = await read(executionId);
    expect(getMetrics).toHaveBeenCalledTimes(3);
    expect(data).toMatchObject({
      status: 'failed',
      workerInvocationCount: 3,
      failure: { code: 'invocation_limit_exceeded' },
    });
    expect(data.stages.metrics?.attemptCount).toBe(3);
  });

  it('records permanent errors without retrying', async () => {
    const executionId = await newExecution();
    const getMetrics = vi.fn().mockRejectedValue(new MetricsLimitExceededError());

    expect(await runAnalysis(executionId, { getMetrics, now: () => at(1) })).toBe('processed');
    expect(await read(executionId)).toMatchObject({
      status: 'failed',
      failure: { code: 'metrics_limit_exceeded', stage: 'metrics' },
    });
  });

  it('times out when the deadline has passed without calling the provider', async () => {
    const executionId = await newExecution();
    const getMetrics = vi.fn().mockResolvedValue(metrics);

    expect(await runAnalysis(executionId, { getMetrics, now: () => at(421) })).toBe('skipped');
    expect(getMetrics).not.toHaveBeenCalled();
    expect(await read(executionId)).toMatchObject({
      status: 'timed_out',
      failure: { code: 'deadline_exceeded' },
    });
  });

  it('treats a slow metrics stage as a bounded transient failure', async () => {
    const executionId = await newExecution();
    const getMetrics = vi.fn(() => new Promise<AggregatedMetrics>(() => undefined));
    const near = new Date(t0.getTime() + 420_000 - 50);

    expect(await runAnalysis(executionId, { getMetrics, now: () => near })).toBe('retry');
    expect((await read(executionId)).lease).toBeUndefined();
  });

  it('keeps timestamps as Firestore timestamps', async () => {
    const executionId = await newExecution();
    const data = await read(executionId);
    expect(data.deadlineAt).toBeInstanceOf(Timestamp);
  });
});
