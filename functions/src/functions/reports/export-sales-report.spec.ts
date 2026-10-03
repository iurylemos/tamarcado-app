import { describe, expect, it } from 'vitest';
import {
  getReportingPeriod,
  buildSalesCsv,
  getTopCollaborators,
  summarizeSales,
  type SalesAppointment,
} from '../../../../shared/domain/reporting';

const period = getReportingPeriod(2030, 2, 'America/Sao_Paulo');

function appointment(id: string, professionalId: string, priceCents = 1000): SalesAppointment {
  return {
    id,
    tenantId: 'tenant-a',
    status: 'completed',
    startsAt: new Date('2030-02-05T12:00:00.000Z'),
    productId: 'service-a',
    productNameSnapshot: 'Serviço',
    productPriceCentsSnapshot: priceCents,
    commissionTypeSnapshot: 'fixed',
    commissionValueSnapshot: 200,
    professionalId,
    professionalNameSnapshot: professionalId,
    customerPhoneE164: '+5511999990000',
  };
}

describe('sales report export', () => {
  it('applies the same product, period, and collaborator filters as the report', () => {
    const result = summarizeSales(
      [
        appointment('first', 'pro-a'),
        { ...appointment('outside', 'pro-a'), startsAt: new Date('2030-03-01T03:00:00.000Z') },
        { ...appointment('other-product', 'pro-b'), productId: 'service-b' },
      ],
      { tenantId: 'tenant-a', period, productId: 'service-a', professionalId: 'pro-a' },
    );

    expect(result.rows.map((row) => row.productId)).toEqual(['service-a']);
    expect(result.totalSalesCents).toBe(1000);
    expect(result.appointmentCount).toBe(1);
    expect(buildSalesCsv(result.rows, period.timezone).split('\r\n')).toHaveLength(2);
  });

  it('returns a valid empty report without fabricated totals', () => {
    const result = summarizeSales([], { tenantId: 'tenant-a', period });
    expect(result).toMatchObject({
      totalSalesCents: 0,
      totalCommissionCents: 0,
      appointmentCount: 0,
      rows: [],
      collaborators: [],
      products: [],
    });
    expect(getTopCollaborators(result.collaborators)).toEqual([]);
  });

  it('exports the filtered transaction rows as UTF-8 CSV without customer data', () => {
    const result = summarizeSales([appointment('private-id', 'Ana')], {
      tenantId: 'tenant-a',
      period,
    });
    const csv = buildSalesCsv(result.rows, period.timezone);

    expect(csv).toContain('"Data","Serviço","Colaborador","Vendas","Comissão"');
    expect(csv).toContain('"Serviço","Ana"');
    expect(csv).not.toContain('+5511999990000');
    expect(csv).not.toContain('private-id');
  });

  it('shows a top-three ranking only when at least three collaborators qualify', () => {
    const two = summarizeSales([appointment('one', 'Ana'), appointment('two', 'Bia')], {
      tenantId: 'tenant-a',
      period,
    });
    const three = summarizeSales(
      [appointment('one', 'Ana'), appointment('two', 'Bia'), appointment('three', 'Caio')],
      { tenantId: 'tenant-a', period },
    );

    expect(getTopCollaborators(two.collaborators)).toEqual([]);
    expect(getTopCollaborators(three.collaborators).map((item) => item.professionalId)).toEqual([
      'Ana',
      'Bia',
      'Caio',
    ]);
  });
});
