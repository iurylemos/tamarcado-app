import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportsPage from './ReportsPage';
import { exportSalesReport, getSalesReport } from '../services/report.service';

vi.mock('../services/report.service', () => ({
  getSalesReport: vi.fn(),
  exportSalesReport: vi.fn(),
  rebuildMonthlyReport: vi.fn(),
  errorMessage: () => 'Não foi possível carregar o relatório.',
}));

const report = {
  year: 2030,
  month: 2,
  timezone: 'America/Sao_Paulo',
  totalSalesCents: 30000,
  totalCommissionCents: 9000,
  appointmentCount: 3,
  products: [],
  rows: [],
  collaborators: [
    {
      professionalId: 'ana',
      professionalName: 'Ana',
      salesCents: 15000,
      commissionCents: 4500,
      appointmentCount: 1,
    },
    {
      professionalId: 'bia',
      professionalName: 'Bia',
      salesCents: 10000,
      commissionCents: 3000,
      appointmentCount: 1,
    },
    {
      professionalId: 'caio',
      professionalName: 'Caio',
      salesCents: 5000,
      commissionCents: 1500,
      appointmentCount: 1,
    },
  ],
};

describe('Backoffice ReportsPage', () => {
  it('filters the report and exports with the same period and product filters', async () => {
    vi.mocked(getSalesReport).mockResolvedValue(report);
    vi.mocked(exportSalesReport).mockResolvedValue();
    render(
      <ReportsPage
        timezone="America/Sao_Paulo"
        products={[
          {
            id: 'service-a',
            tenantId: 'tenant-a',
            name: 'Serviço',
            imageUrl: 'https://example.test/service.png',
            priceCents: 30000,
            durationMinutes: 30,
            commissionType: 'fixed',
            commissionValue: 1000,
            active: true,
          },
        ]}
        professionals={[]}
      />,
    );

    expect(await screen.findByText(/R\$\s?300,00/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Serviço'), { target: { value: 'service-a' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Aplicar filtros' }).closest('form')!);
    await waitFor(() =>
      expect(getSalesReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ productId: 'service-a' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() =>
      expect(exportSalesReport).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'service-a' }),
      ),
    );
    expect(getSalesReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ productId: 'service-a' }),
    );
  });

  it('shows no ranking when fewer than three collaborators have eligible sales', async () => {
    vi.mocked(getSalesReport).mockResolvedValue({
      ...report,
      collaborators: report.collaborators.slice(0, 2),
    });
    render(<ReportsPage timezone="America/Sao_Paulo" products={[]} professionals={[]} />);
    expect(await screen.findByText('Vendas por colaborador')).toBeInTheDocument();
    expect(
      screen.getByText('Ranking disponível após três colaboradores com vendas.'),
    ).toBeInTheDocument();
  });

  it('shows an explicit empty state for periods with no completed sales', async () => {
    vi.mocked(getSalesReport).mockResolvedValue({
      ...report,
      totalSalesCents: 0,
      totalCommissionCents: 0,
      appointmentCount: 0,
      collaborators: [],
    });
    render(<ReportsPage timezone="America/Sao_Paulo" products={[]} professionals={[]} />);
    expect(await screen.findByText('Nenhuma venda concluída neste período.')).toBeInTheDocument();
  });
});
