import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportsPage from './ReportsPage';
import { getCollaboratorReport } from '../services/report.service';

vi.mock('../services/report.service', () => ({
  getCollaboratorReport: vi.fn(),
  errorMessage: () => 'Não foi possível carregar o relatório.',
}));

describe('Collaborator ReportsPage', () => {
  it('shows monthly sales and commission from the report service', async () => {
    vi.mocked(getCollaboratorReport).mockResolvedValue({
      year: 2030,
      month: 2,
      timezone: 'America/Sao_Paulo',
      totalSalesCents: 12000,
      totalCommissionCents: 4200,
      appointmentCount: 1,
      products: [],
      rows: [],
      collaborators: [],
    });

    render(<ReportsPage initialPeriod={{ year: 2030, month: 2 }} />);

    expect(await screen.findByText(/R\$\s?120,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?42,00/)).toBeInTheDocument();
  });

  it('shows an explicit empty state when there are no completed transactions', async () => {
    vi.mocked(getCollaboratorReport).mockResolvedValue({
      year: 2030,
      month: 2,
      timezone: 'America/Sao_Paulo',
      totalSalesCents: 0,
      totalCommissionCents: 0,
      appointmentCount: 0,
      products: [],
      rows: [],
      collaborators: [],
    });

    render(<ReportsPage initialPeriod={{ year: 2030, month: 2 }} />);
    expect(await screen.findByText('Nenhuma venda concluída neste período.')).toBeInTheDocument();
  });
});
