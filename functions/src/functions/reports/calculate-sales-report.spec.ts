import { describe, expect, it } from 'vitest';
import { calculateSnapshotCommission } from '../../../../shared/domain/commission';
import { getReportingPeriod, summarizeSales } from '../../../../shared/domain/reporting';
import { calculateCollaboratorReport, parseReportRequest } from '../../services/report.service';

describe('sales report calculations', () => {
  it('uses snapshotted commercial values and rounds percentage commission half up', () => {
    expect(calculateSnapshotCommission(101, 'percentage', 5000)).toBe(51);
    expect(calculateSnapshotCommission(101, 'fixed', 2500)).toBe(2500);
    expect(calculateSnapshotCommission(Number.MAX_SAFE_INTEGER, 'percentage', 10_000)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('includes only completed sales and aggregates tenant-local monthly data', () => {
    const period = getReportingPeriod(2030, 2, 'America/Sao_Paulo');
    expect(period.startsAt.toISOString()).toBe('2030-02-01T03:00:00.000Z');
    expect(period.endsAt.toISOString()).toBe('2030-03-01T03:00:00.000Z');

    const result = summarizeSales(
      [
        {
          tenantId: 'tenant-a',
          status: 'completed',
          startsAt: new Date('2030-02-01T03:00:00.000Z'),
          productId: 'service-a',
          productNameSnapshot: 'Serviço',
          productPriceCentsSnapshot: 101,
          commissionTypeSnapshot: 'percentage',
          commissionValueSnapshot: 5000,
          professionalId: 'pro-a',
          professionalNameSnapshot: 'Ana',
        },
        {
          tenantId: 'tenant-a',
          status: 'pending',
          startsAt: new Date('2030-02-05T12:00:00.000Z'),
          productId: 'service-a',
          productNameSnapshot: 'Serviço',
          productPriceCentsSnapshot: 1000,
          commissionTypeSnapshot: 'fixed',
          commissionValueSnapshot: 200,
          professionalId: 'pro-a',
          professionalNameSnapshot: 'Ana',
        },
        {
          tenantId: 'tenant-b',
          status: 'completed',
          startsAt: new Date('2030-02-05T12:00:00.000Z'),
          productId: 'service-a',
          productNameSnapshot: 'Serviço',
          productPriceCentsSnapshot: 1000,
          commissionTypeSnapshot: 'fixed',
          commissionValueSnapshot: 200,
          professionalId: 'pro-a',
          professionalNameSnapshot: 'Ana',
        },
      ],
      { tenantId: 'tenant-a', period },
    );

    expect(result).toMatchObject({
      totalSalesCents: 101,
      totalCommissionCents: 51,
      appointmentCount: 1,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.commissionCents).toBe(51);
  });

  it('excludes appointments outside the local month boundaries', () => {
    const period = getReportingPeriod(2030, 2, 'America/Sao_Paulo');
    const summary = summarizeSales(
      [
        {
          tenantId: 'tenant-a',
          status: 'completed',
          startsAt: new Date('2030-02-01T02:59:59.999Z'),
          productId: 'service-a',
          productNameSnapshot: 'Serviço',
          productPriceCentsSnapshot: 300,
          commissionTypeSnapshot: 'fixed',
          commissionValueSnapshot: 100,
          professionalId: 'pro-a',
          professionalNameSnapshot: 'Ana',
        },
        {
          tenantId: 'tenant-a',
          status: 'completed',
          startsAt: new Date('2030-03-01T03:00:00.000Z'),
          productId: 'service-a',
          productNameSnapshot: 'Serviço',
          productPriceCentsSnapshot: 300,
          commissionTypeSnapshot: 'fixed',
          commissionValueSnapshot: 100,
          professionalId: 'pro-a',
          professionalNameSnapshot: 'Ana',
        },
      ],
      { tenantId: 'tenant-a', period },
    );

    expect(summary.appointmentCount).toBe(0);
    expect(summary.totalSalesCents).toBe(0);
  });

  it('rejects unsupported periods and time zones', () => {
    expect(() => getReportingPeriod(2030, 13, 'America/Sao_Paulo')).toThrow(RangeError);
    expect(() => getReportingPeriod(2030, 2, 'Invalid/Timezone')).toThrow(RangeError);
  });

  it('keeps collaborator report requests inside the authenticated professional scope', async () => {
    const actor = {
      uid: 'collaborator-ana',
      tenantId: 'tenant-a',
      role: 'collaborator' as const,
      professionalId: 'pro-a',
      name: 'Ana',
      phoneE164: '+5511999990001',
      active: true,
    };

    await expect(
      calculateCollaboratorReport(actor, { year: 2030, month: 2, professionalId: 'pro-b' }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(
      calculateCollaboratorReport({ ...actor, professionalId: undefined }, {}),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(() => parseReportRequest({ year: 2030 })).toThrow();
  });
});
