import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GCLOUD_PROJECT ??= 'demo-tamarcado';
});

import { collections } from '../../config/collections';
import { firestore } from '../../services/firestore.service';
import {
  assertLocalEmulator,
  callableRequest,
  cleanupTenants,
  emulatorAvailable,
  seedTenantWithBackoffice,
  type TestTenant,
} from '../../../test/ai-analysis-helpers';
import { startAnalysisCallable } from './start-analysis';

const validInput = (overrides: Record<string, unknown> = {}) => ({
  idempotencyKey: 'key-0123456789abcdef',
  goal: 'Entender o desempenho de vendas do trimestre',
  period: { start: '2030-01-01', endExclusive: '2030-02-01' },
  ...overrides,
});

const created: string[] = [];

async function tenant(...args: Parameters<typeof seedTenantWithBackoffice>): Promise<TestTenant> {
  const seeded = await seedTenantWithBackoffice(...args);
  created.push(seeded.tenantId);
  return seeded;
}

async function executionsOf(tenantId: string) {
  const snapshot = await firestore
    .collection(collections.aiAnalysisExecutions)
    .where('tenantId', '==', tenantId)
    .get();
  return snapshot.docs;
}

describe.skipIf(!emulatorAvailable)('startAnalysis callable', () => {
  beforeAll(assertLocalEmulator);
  afterAll(async () => cleanupTenants(created));

  it('rejects anonymous callers', async () => {
    const request = { data: validInput(), rawRequest: {}, acceptsStreaming: false } as never;
    await expect(startAnalysisCallable.run(request)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rejects non-backoffice roles, inactive users and divergent claims', async () => {
    const collaborator = await tenant('America/Sao_Paulo', { role: 'collaborator' });
    await expect(
      startAnalysisCallable.run(
        callableRequest(collaborator, validInput(), { role: 'collaborator' }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const inactive = await tenant('America/Sao_Paulo', { active: false });
    await expect(
      startAnalysisCallable.run(callableRequest(inactive, validInput())),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const mismatched = await tenant();
    await expect(
      startAnalysisCallable.run(callableRequest(mismatched, validInput(), { tenantId: 'other' })),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    for (const seeded of [collaborator, inactive, mismatched]) {
      expect(await executionsOf(seeded.tenantId)).toHaveLength(0);
    }
  });

  it.each([
    ['client tenantId', { tenantId: 'tenant-b' }],
    ['uid', { uid: 'someone' }],
    ['role', { role: 'backoffice' }],
    ['provider', { provider: 'openai' }],
    ['tools', { tools: ['x'] }],
    ['short goal', { goal: 'curto' }],
    ['control characters', { goal: 'objetivo\u0000 com caractere de controle' }],
    ['long goal', { goal: 'a'.repeat(501) }],
    ['bad key', { idempotencyKey: 'short' }],
    ['inverted period', { period: { start: '2030-02-01', endExclusive: '2030-01-01' } }],
    ['empty period', { period: { start: '2030-01-01', endExclusive: '2030-01-01' } }],
    ['too wide', { period: { start: '2028-01-01', endExclusive: '2030-01-01' } }],
    ['invalid date', { period: { start: '2030-02-30', endExclusive: '2030-03-10' } }],
    ['extra period field', { period: { start: '2030-01-01', endExclusive: '2030-02-01', x: 1 } }],
  ])('rejects invalid input: %s', async (_name, overrides) => {
    const seeded = await tenant();
    await expect(
      startAnalysisCallable.run(callableRequest(seeded, validInput(overrides))),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(await executionsOf(seeded.tenantId)).toHaveLength(0);
  });

  it('rejects non-object payloads', async () => {
    const seeded = await tenant();
    await expect(startAnalysisCallable.run(callableRequest(seeded, null))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('creates a queued execution scoped to the authenticated tenant', async () => {
    const seeded = await tenant('America/Manaus');
    const result = await startAnalysisCallable.run(callableRequest(seeded, validInput()));

    expect(result).toMatchObject({ status: 'queued' });
    const documents = await executionsOf(seeded.tenantId);
    expect(documents).toHaveLength(1);
    const data = documents[0]!.data();
    expect(documents[0]!.id).toBe((result as { executionId: string }).executionId);
    expect(data).toMatchObject({
      tenantId: seeded.tenantId,
      requesterUid: seeded.uid,
      status: 'queued',
      workerInvocationCount: 0,
      request: { timezone: 'America/Manaus', period: validInput().period },
    });
    expect(data.deadlineAt.toMillis() - data.createdAt.toMillis()).toBe(420_000);
    expect(JSON.stringify(data)).not.toContain('key-0123456789abcdef');
  });

  it('is idempotent for the same key and input and conflicts on different input', async () => {
    const seeded = await tenant();
    const first = (await startAnalysisCallable.run(callableRequest(seeded, validInput()))) as {
      executionId: string;
    };
    const replay = (await startAnalysisCallable.run(
      callableRequest(
        seeded,
        validInput({ goal: '  Entender   o desempenho de vendas do trimestre ' }),
      ),
    )) as { executionId: string };

    expect(replay.executionId).toBe(first.executionId);
    expect(await executionsOf(seeded.tenantId)).toHaveLength(1);

    await expect(
      startAnalysisCallable.run(
        callableRequest(seeded, validInput({ goal: 'Um objetivo totalmente diferente' })),
      ),
    ).rejects.toMatchObject({ code: 'already-exists' });
  });

  it('allows one active execution per tenant and scopes keys to tenants', async () => {
    const tenantA = await tenant();
    const tenantB = await tenant();
    await startAnalysisCallable.run(callableRequest(tenantA, validInput()));

    await expect(
      startAnalysisCallable.run(
        callableRequest(tenantA, validInput({ idempotencyKey: 'another-key-0123456789' })),
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const other = (await startAnalysisCallable.run(callableRequest(tenantB, validInput()))) as {
      executionId: string;
    };
    const [documentB] = await executionsOf(tenantB.tenantId);
    expect(documentB!.id).toBe(other.executionId);
    expect(documentB!.data().tenantId).toBe(tenantB.tenantId);
  });

  it('creates a single execution for concurrent identical requests', async () => {
    const seeded = await tenant();
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        startAnalysisCallable.run(callableRequest(seeded, validInput())),
      ),
    );
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    expect(await executionsOf(seeded.tenantId)).toHaveLength(1);
  });
});
