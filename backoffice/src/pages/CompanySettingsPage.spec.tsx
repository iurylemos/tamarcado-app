import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { saveCompany } from '../services/admin.service';
import type { CompanyRecord } from '../interfaces/admin.interface';
import CompanySettingsPage from './CompanySettingsPage';

vi.mock('../services/admin.service', () => ({
  saveCompany: vi.fn(),
  errorMessage: () => 'Falha ao salvar',
}));
const saveCompanyMock = vi.mocked(saveCompany);

const company: CompanyRecord = {
  id: 'tenant-aurora',
  name: 'Studio Aurora',
  slug: 'studio-aurora',
  segment: 'beauty',
  description: 'Cuidado e beleza no seu ritmo.',
  logoUrl: 'https://images.example.test/logo.jpg',
  timezone: 'America/Sao_Paulo',
  bookingIntervalMinutes: 15,
  active: true,
};

describe('CompanySettingsPage', () => {
  it('renders seeded public business and booking settings', () => {
    render(<CompanySettingsPage company={company} onSaved={vi.fn(async () => undefined)} />);

    expect(screen.getByDisplayValue('Studio Aurora')).toBeInTheDocument();
    expect(screen.getByDisplayValue('studio-aurora')).toBeInTheDocument();
    expect(screen.getByDisplayValue('America/Sao_Paulo')).toBeInTheDocument();
    expect(screen.getByText('tamarcado.com/studio-aurora')).toBeInTheDocument();
  });

  it('confirms successful save and surfaces errors', async () => {
    saveCompanyMock.mockResolvedValueOnce({ saved: true });
    render(<CompanySettingsPage company={company} onSaved={vi.fn(async () => undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Alterações salvas');

    saveCompanyMock.mockRejectedValueOnce(new Error('save failure'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');
  });
});
