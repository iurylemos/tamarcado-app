import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GCLOUD_PROJECT ??= 'demo-tamarcado';
});

import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../config/collections';
import type { AnalysisRequestSnapshot } from '../../model/ai-analysis.model';
import { firestore } from '../../services/firestore.service';
import {
  assertLocalEmulator,
  cleanupTenants,
  emulatorAvailable,
  seedAppointment,
} from '../../../test/ai-analysis-helpers';
import {
  buildAggregatedMetrics,
  getAggregatedMetrics,
  type MetricsAppointment,
} from './authorized-metrics.tool';

const request: AnalysisRequestSnapshot = {
  schemaVersion: 1,
  goal: 'Entender vendas do período',
  period: { start: '2030-02-01', endExclusive: '2030-03-01' },
  timezone: 'America/Sao_Paulo',
};

function appointment(overrides: Partial<MetricsAppointment> = {}): MetricsAppointment {
  return {
    tenantId: 'tenant-a',
    status: 'completed',
    startsAt: new Date('2030-02-10T12:00:00.000Z'),
    productId: 'product-a',
    productNameSnapshot: 'Corte',
    productPriceCentsSnapshot: 10_000,
    commissionTypeSnapshot: 'fixed',
    commissionValueSnapshot: 1_000,
    professionalId: 'pro-a',
    professionalNameSnapshot: 'Ana',
    ...overrides,
  };
}

describe('aggregated metrics', () => {
  it('aggregates only the authorized tenant and period with integer cents', () => {
    const metrics = buildAggregatedMetrics(
      [
        appointment(),
        appointment({ status: 'cancelled' }),
        appointment({ status: 'pending' }),
        appointment({ tenantId: 'tenant-b', productPriceCentsSnapshot: 99_999 }),
        appointment({ startsAt: new Date('2030-01-31T12:00:00.000Z') }),
        appointment({ startsAt: new Date('2030-03-01T03:00:00.000Z') }),
      ],
      'tenant-a',
      request,
    );

    expect(metrics).toMatchObject({
      coverage: 'sufficient',
      appointmentCount: 3,
      statusCounts: { pending: 1, confirmed: 0, cancelled: 1, completed: 1 },
      completedSalesCents: { available: true, value: 10_000 },
      completedCommissionCents: { available: true, value: 1_000 },
    });
  });

  it('treats the period end as exclusive in the company timezone', () => {
    const metrics = buildAggregatedMetrics(
      [
        appointment({ startsAt: new Date('2030-02-01T03:00:00.000Z') }),
        appointment({ startsAt: new Date('2030-03-01T03:00:00.000Z') }),
      ],
      'tenant-a',
      request,
    );
    expect(metrics.appointmentCount).toBe(1);
  });

  it('reports no data distinctly and never invents values', () => {
    const metrics = buildAggregatedMetrics(
      [appointment({ tenantId: 'tenant-b' })],
      'tenant-a',
      request,
    );

    expect(metrics.coverage).toBe('no_data');
    expect(metrics.appointmentCount).toBe(0);
    expect(metrics.completedSalesCents).toMatchObject({ available: false });
    expect(metrics.completedCommissionCents).toMatchObject({ available: false });
  });

  it('marks capacity-dependent metrics as unavailable with a limitation', () => {
    const metrics = buildAggregatedMetrics([appointment()], 'tenant-a', request);
    expect(metrics.occupancy).toMatchObject({ available: false });
    expect(metrics.periodComparison).toMatchObject({ available: false });
    expect(metrics.occupancy).toHaveProperty('limitation');
  });

  it('exposes no individual identifiers', () => {
    const output = JSON.stringify(buildAggregatedMetrics([appointment()], 'tenant-a', request));
    for (const forbidden of ['Ana', 'pro-a', 'product-a', 'Corte', 'tenant-a', '+55']) {
      expect(output).not.toContain(forbidden);
    }
  });
});

describe.skipIf(!emulatorAvailable)('getAggregatedMetrics with Firestore', () => {
  const tenantA = `ai-metrics-a-${crypto.randomUUID()}`;
  const tenantB = `ai-metrics-b-${crypto.randomUUID()}`;
  const executionIds: string[] = [];

  async function execution(tenantId: string, overrides: Record<string, unknown> = {}) {
    const ref = firestore.collection(collections.aiAnalysisExecutions).doc();
    executionIds.push(ref.id);
    await ref.set({ tenantId, request, ...overrides });
    return ref.id;
  }

  beforeAll(async () => {
    assertLocalEmulator();
    const inPeriod = new Date('2030-02-10T12:00:00.000Z');
    await seedAppointment(tenantA, inPeriod);
    await seedAppointment(tenantA, inPeriod, { status: 'cancelled' });
    await seedAppointment(tenantA, new Date('2030-04-10T12:00:00.000Z'));
    await seedAppointment(tenantB, inPeriod, { productPriceCentsSnapshot: 77_000 });
  });

  afterAll(async () => {
    await cleanupTenants([tenantA, tenantB]);
    await Promise.all(
      executionIds.map((id) =>
        firestore.collection(collections.aiAnalysisExecutions).doc(id).delete(),
      ),
    );
  });

  it('derives tenant from the execution and isolates tenants', async () => {
    const a = await getAggregatedMetrics(await execution(tenantA));
    const b = await getAggregatedMetrics(await execution(tenantB));

    expect(a).toMatchObject({
      appointmentCount: 2,
      completedSalesCents: { available: true, value: 10_000 },
    });
    expect(b).toMatchObject({
      appointmentCount: 1,
      completedSalesCents: { available: true, value: 77_000 },
    });
  });

  it('reports no data for a tenant without appointments', async () => {
    const metrics = await getAggregatedMetrics(
      await execution(`ai-metrics-empty-${crypto.randomUUID()}`),
    );
    expect(metrics.coverage).toBe('no_data');
  });

  it('refuses executions without tenant or request', async () => {
    await expect(getAggregatedMetrics('missing-execution')).rejects.toThrow('metrics_unavailable');
    const broken = await execution(tenantA, { request: null, createdAt: Timestamp.now() });
    await expect(getAggregatedMetrics(broken)).rejects.toThrow('metrics_unavailable');
  });
});
