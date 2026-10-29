import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import {
  getFirestore,
  type DocumentReference,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { tavily } from '@tavily/core';
import { onDocumentCreated, type FirestoreEvent } from 'firebase-functions/v2/firestore';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const collectionName = 'ai_analysis_smoke_executions';
const projectId = 'demo-ai-analysis-smoke';
const leaseMs = 1_000;
const deadlineMs = 420_000;
const maxInvocations = 3;
const maxStageAttempts = 3;
const app = initializeApp({ projectId }, 'ai-analysis-compatibility-smoke');
const firestore = getFirestore(app);
const executionIds = new Set<string>();
let mockSearchServer: Server;
let mockSearchUrl: string;
let mockSearchCount = 0;
let clockMs = Date.now();
let nextOwner = 0;

const metricsTool = createTool({
  id: 'smoke-authorized-metrics',
  description: 'Aggregate synthetic rows for one tenant.',
  inputSchema: z.object({
    tenantId: z.string(),
    rows: z.array(z.object({ tenantId: z.string(), count: z.number() })),
  }),
  outputSchema: z.object({ count: z.number() }),
  execute: async ({ tenantId, rows }) => ({
    count: rows
      .filter((row) => row.tenantId === tenantId)
      .reduce((total, row) => total + row.count, 0),
  }),
});

const smokeAgent = new Agent({
  id: 'ai-analysis-compatibility-smoke',
  name: 'Compatibility smoke agent',
  instructions: 'This agent is initialized only; no model request is made.',
  model: 'openai/gpt-4o-mini',
  tools: { metrics: metricsTool },
});

interface SmokeExecution {
  tenantId: string;
  rows: Array<{ tenantId: string; count: number }>;
  deadlineAt: number;
  invocationCount: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'timed_out';
  fencingToken: number;
  leaseOwner?: string;
  leaseExpiresAt?: number;
  stageAttemptCount: number;
  metricsCheckpoint?: { status: 'succeeded'; output: { count: number } };
  interruptAfterCheckpoint?: boolean;
  interruptedAfterCheckpoint?: boolean;
  crashAfterProviderResponse?: boolean;
}

interface WorkerHooks {
  afterClaim?: () => Promise<void>;
}

function createWorker(hooks: WorkerHooks = {}) {
  return onDocumentCreated(
    {
      document: `${collectionName}/{executionId}`,
      region: 'southamerica-east1',
      timeoutSeconds: 540,
      retry: true,
    },
    async (event) => {
      if (!event.data) return;

      const executionId = event.params.executionId;
      const executionRef = firestore.collection(collectionName).doc(executionId);
      const owner = `smoke-${++nextOwner}`;
      const claim = await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(executionRef);
        if (!snapshot.exists) return { state: 'missing' as const };

        const execution = snapshot.data() as SmokeExecution;
        if (['succeeded', 'failed', 'timed_out'].includes(execution.status)) {
          return { state: 'terminal' as const };
        }

        if (execution.deadlineAt <= clockMs) {
          transaction.update(executionRef, { status: 'timed_out' });
          return { state: 'deadline' as const };
        }

        if ((execution.leaseExpiresAt ?? 0) > clockMs) {
          return { state: 'leased' as const };
        }

        if (execution.invocationCount >= maxInvocations) {
          transaction.update(executionRef, { status: 'failed' });
          return { state: 'invocation_limit' as const };
        }

        const fencingToken = execution.fencingToken + 1;
        transaction.update(executionRef, {
          invocationCount: execution.invocationCount + 1,
          leaseOwner: owner,
          leaseExpiresAt: clockMs + leaseMs,
          fencingToken,
          status: 'running',
        });
        return { state: 'claimed' as const, fencingToken };
      });

      if (claim.state !== 'claimed') return;
      await hooks.afterClaim?.();

      const snapshot = await executionRef.get();
      const execution = snapshot.data() as SmokeExecution;
      if (execution.metricsCheckpoint?.status === 'succeeded') {
        await finishExecution(executionRef, claim.fencingToken, owner);
        return;
      }

      const attempt = await firestore.runTransaction(async (transaction) => {
        const current = await transaction.get(executionRef);
        if (!current.exists) return { state: 'missing' as const };

        const data = current.data() as SmokeExecution;
        if (data.fencingToken !== claim.fencingToken || data.leaseOwner !== owner) {
          return { state: 'fenced' as const };
        }
        if (data.stageAttemptCount >= maxStageAttempts) {
          transaction.update(executionRef, { status: 'failed' });
          return { state: 'attempt_limit' as const };
        }

        const attemptCount = data.stageAttemptCount + 1;
        transaction.update(executionRef, { stageAttemptCount: attemptCount });
        return { state: 'attempted' as const, attemptCount };
      });

      if (attempt.state !== 'attempted') return;

      const search = tavily({ apiKey: 'smoke-only-not-a-real-key', apiBaseURL: mockSearchUrl });
      await search.search('synthetic compatibility query', { maxResults: 1 });
      if (execution.crashAfterProviderResponse) {
        throw new Error('simulated interruption after mocked provider response');
      }

      const metrics = await executeMetrics({
        tenantId: execution.tenantId,
        rows: execution.rows,
      });
      const saved = await firestore.runTransaction(async (transaction) => {
        const current = await transaction.get(executionRef);
        if (!current.exists) return false;

        const data = current.data() as SmokeExecution;
        if (data.fencingToken !== claim.fencingToken || data.leaseOwner !== owner) return false;

        const interruptAfterCheckpoint =
          data.interruptAfterCheckpoint && !data.interruptedAfterCheckpoint;
        transaction.update(executionRef, {
          metricsCheckpoint: { status: 'succeeded', output: metrics },
          leaseExpiresAt: clockMs,
          ...(interruptAfterCheckpoint ? { interruptedAfterCheckpoint: true } : {}),
        });
        return Boolean(interruptAfterCheckpoint);
      });

      if (saved) throw new Error('simulated interruption after Firestore checkpoint');
      await finishExecution(executionRef, claim.fencingToken, owner);
    },
  );
}

async function finishExecution(
  executionRef: DocumentReference,
  fencingToken: number,
  owner: string,
): Promise<void> {
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(executionRef);
    if (!snapshot.exists) return;

    const execution = snapshot.data() as SmokeExecution;
    if (execution.fencingToken !== fencingToken || execution.leaseOwner !== owner) return;
    transaction.update(executionRef, { status: 'succeeded', leaseExpiresAt: clockMs });
  });
}

async function executeMetrics(input: {
  tenantId: string;
  rows: Array<{ tenantId: string; count: number }>;
}): Promise<{ count: number }> {
  const execute = metricsTool.execute;
  if (!execute) throw new Error('Mastra smoke tool has no execute function.');

  const output = await execute(input, {});
  if (!output || !('count' in output)) {
    throw new Error('Mastra smoke tool returned an invalid aggregate.');
  }
  return output;
}

async function createExecution(
  overrides: Partial<SmokeExecution> = {},
): Promise<FirestoreEvent<QueryDocumentSnapshot, { executionId: string }>> {
  const executionId = randomUUID();
  executionIds.add(executionId);
  const executionRef = firestore.collection(collectionName).doc(executionId);
  await executionRef.create({
    tenantId: 'tenant-a',
    rows: [
      { tenantId: 'tenant-a', count: 4 },
      { tenantId: 'tenant-b', count: 99 },
    ],
    deadlineAt: clockMs + deadlineMs,
    invocationCount: 0,
    status: 'queued',
    fencingToken: 0,
    stageAttemptCount: 0,
    ...overrides,
  } satisfies SmokeExecution);

  const query = await firestore
    .collection(collectionName)
    .where('__name__', '==', executionId)
    .get();
  const snapshot = query.docs[0];
  if (!snapshot) throw new Error('Smoke execution was not persisted in the Firestore emulator.');

  return {
    data: snapshot,
    params: { executionId },
    id: `smoke-event-${executionId}`,
    source: `//firestore.googleapis.com/projects/${projectId}/databases/(default)`,
    specversion: '1.0',
    type: 'google.cloud.firestore.document.v1.created',
    time: new Date(clockMs).toISOString(),
    location: 'southamerica-east1',
    project: projectId,
    database: '(default)',
    namespace: '(default)',
    document: `${collectionName}/${executionId}`,
  };
}

async function readExecution(executionId: string): Promise<SmokeExecution> {
  const snapshot = await firestore.collection(collectionName).doc(executionId).get();
  if (!snapshot.exists) throw new Error(`Missing smoke execution ${executionId}.`);
  return snapshot.data() as SmokeExecution;
}

describe('Node 24 / TypeScript 6 / NodeNext AI compatibility smoke', () => {
  beforeEach(() => {
    mockSearchCount = 0;
    clockMs = Date.now();
  });

  beforeAll(async () => {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    if (!emulatorHost || !/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(emulatorHost)) {
      throw new Error('This smoke test requires the local Firestore emulator.');
    }

    mockSearchServer = createServer((request, response) => {
      mockSearchCount += 1;
      request.resume();
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          query: 'synthetic compatibility query',
          response_time: 0,
          images: [],
          results: [],
          request_id: 'smoke-request',
        }),
      );
    });

    await new Promise<void>((resolve, reject) => {
      mockSearchServer.once('error', reject);
      mockSearchServer.listen(0, '127.0.0.1', resolve);
    });
    const address = mockSearchServer.address() as AddressInfo;
    mockSearchUrl = `http://127.0.0.1:${address.port}`;
  }, 20_000);

  afterAll(async () => {
    await Promise.all(
      [...executionIds].map((id) => firestore.collection(collectionName).doc(id).delete()),
    );
    if (mockSearchServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        mockSearchServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await deleteApp(app);
  });

  it('initializes a Mastra agent and executes its tool without a model provider call', async () => {
    expect(smokeAgent.id).toBe('ai-analysis-compatibility-smoke');
    await expect(
      executeMetrics({
        tenantId: 'tenant-a',
        rows: [
          { tenantId: 'tenant-a', count: 4 },
          { tenantId: 'tenant-b', count: 99 },
        ],
      }),
    ).resolves.toEqual({ count: 4 });
  });

  it('invokes a Functions v2 worker, persists a Firestore checkpoint, and resumes without repeating work', async () => {
    const event = await createExecution({ interruptAfterCheckpoint: true });
    const worker = createWorker();
    expect(worker.__endpoint?.timeoutSeconds).toBe(540);
    expect(worker.__endpoint?.eventTrigger?.retry).toBe(true);

    await expect(worker.run(event)).rejects.toThrow(
      'simulated interruption after Firestore checkpoint',
    );
    expect((await readExecution(event.params.executionId)).metricsCheckpoint?.output.count).toBe(4);
    expect(mockSearchCount).toBe(1);

    clockMs += leaseMs + 1;
    await worker.run(event);
    await worker.run(event);

    expect((await readExecution(event.params.executionId)).status).toBe('succeeded');
    expect(mockSearchCount).toBe(1);
  });

  it('prevents concurrent and duplicate invocations from duplicating stage work', async () => {
    const event = await createExecution();
    let releaseClaim: (() => void) | undefined;
    let signalClaimed: (() => void) | undefined;
    const claimed = new Promise<void>((resolve) => {
      signalClaimed = resolve;
    });
    const paused = new Promise<void>((resolve) => {
      releaseClaim = resolve;
    });
    const worker = createWorker({
      afterClaim: async () => {
        signalClaimed?.();
        await paused;
      },
    });

    const firstInvocation = worker.run(event);
    await claimed;
    await worker.run(event);
    releaseClaim?.();
    await firstInvocation;
    await worker.run(event);

    expect((await readExecution(event.params.executionId)).status).toBe('succeeded');
    expect(mockSearchCount).toBe(1);
  });

  it('limits ambiguous mocked-provider retries and never exceeds the application deadline', async () => {
    const retryEvent = await createExecution({ crashAfterProviderResponse: true });
    const worker = createWorker();

    for (let attempt = 0; attempt < maxStageAttempts; attempt += 1) {
      if (attempt > 0) clockMs += leaseMs + 1;
      await expect(worker.run(retryEvent)).rejects.toThrow(
        'simulated interruption after mocked provider response',
      );
    }
    clockMs += leaseMs + 1;
    await worker.run(retryEvent);
    expect((await readExecution(retryEvent.params.executionId)).stageAttemptCount).toBe(
      maxStageAttempts,
    );
    expect(mockSearchCount).toBe(maxStageAttempts);

    const expiredEvent = await createExecution({ deadlineAt: clockMs - 1 });
    await worker.run(expiredEvent);
    expect((await readExecution(expiredEvent.params.executionId)).status).toBe('timed_out');
  });

  it('uses the local Tavily mock endpoint only', async () => {
    expect(mockSearchUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const response = await tavily({
      apiKey: 'smoke-only-not-a-real-key',
      apiBaseURL: mockSearchUrl,
    }).search('synthetic compatibility query', { maxResults: 1 });
    expect(response.requestId).toBe('smoke-request');
    expect(mockSearchCount).toBe(1);
  });
});
