import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GCLOUD_PROJECT ??= 'demo-tamarcado';
});

import { collections } from '../../config/collections';
import type { AggregatedMetrics } from '../../model/ai-analysis.model';
import { firestore } from '../../services/firestore.service';
import {
  assertLocalEmulator,
  callableRequest,
  cleanupTenants,
  emulatorAvailable,
  seedTenantWithBackoffice,
  type TestTenant,
} from '../../../test/ai-analysis-helpers';
import { createQueuedExecution } from '../../ai/services/checkpoint.service';
import { getAnalysisReportCallable } from './get-analysis-report';

const tenants: TestTenant[] = [];

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

const report = {
  schemaVersion: 1,
  period: { start: '2030-02-01', endExclusive: '2030-03-01' },
  summary: 'Não há dados no período.',
  facts: [],
  inferences: [],
  recommendations: [],
  limitations: ['Não há agendamentos no período.'],
  sources: [],
};

describe.skipIf(!emulatorAvailable)('getAnalysisReport callable', () => {
  beforeAll(assertLocalEmulator);
  afterAll(async () => cleanupTenants(tenants.map(({ tenantId }) => tenantId)));

  async function createExecution(tenant: TestTenant, status: 'queued' | 'succeeded') {
    const created = await createQueuedExecution({
      tenantId: tenant.tenantId,
      requesterUid: tenant.uid,
      idempotencyKey: crypto.randomUUID(),
      request: {
        schemaVersion: 1,
        goal: 'Entender os indicadores do período',
        period: { start: '2030-02-01', endExclusive: '2030-03-01' },
        timezone: 'America/Sao_Paulo',
      },
    });
    if (status === 'succeeded') {
      await firestore
        .collection(collections.aiAnalysisExecutions)
        .doc(created.executionId)
        .update({ status, metrics, report });
    }
    return created.executionId;
  }

  it('returns only validated results for the caller tenant', async () => {
    const tenantA = await seedTenantWithBackoffice();
    const tenantB = await seedTenantWithBackoffice();
    tenants.push(tenantA, tenantB);
    const executionId = await createExecution(tenantA, 'succeeded');

    const response = await getAnalysisReportCallable.run(
      callableRequest(tenantA, { executionId }),
    );
    expect(response).toMatchObject({
      status: 'succeeded',
      metrics: { coverage: 'no_data', appointmentCount: 0 },
      report: { summary: 'Não há dados no período.' },
    });

    await expect(
      getAnalysisReportCallable.run(callableRequest(tenantB, { executionId })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('does not expose a report while the execution is queued', async () => {
    const tenant = await seedTenantWithBackoffice();
    tenants.push(tenant);
    const executionId = await createExecution(tenant, 'queued');

    await expect(
      getAnalysisReportCallable.run(callableRequest(tenant, { executionId })),
    ).resolves.toEqual({ status: 'queued' });
  });

  it('rejects malformed requests and anonymous callers', async () => {
    const tenant = await seedTenantWithBackoffice();
    tenants.push(tenant);
    await expect(
      getAnalysisReportCallable.run(callableRequest(tenant, { executionId: '' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      getAnalysisReportCallable.run({
        data: { executionId: 'private-id' },
        rawRequest: {},
        acceptsStreaming: false,
      } as never),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});
