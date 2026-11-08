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
  phoneE164: '+5511999990001',
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
    expect(screen.getByLabelText('Telefone de contato')).toHaveValue('(11) 99999-0001');
    expect(screen.getByText('tamarcado.com/studio-aurora')).toBeInTheDocument();
  });

  it('formats the contact phone while typing', () => {
    render(<CompanySettingsPage company={company} onSaved={vi.fn(async () => undefined)} />);
    const phoneInput = screen.getByLabelText('Telefone de contato');

    fireEvent.change(phoneInput, { target: { value: '11988887777' } });

    expect(phoneInput).toHaveValue('(11) 98888-7777');
  });

  it('keeps color pickers, hexadecimal values, and the live preview synchronized', () => {
    render(<CompanySettingsPage company={company} onSaved={vi.fn(async () => undefined)} />);
    const primaryPicker = screen.getByLabelText('Seletor de cor primária');
    const primaryHex = screen.getByLabelText('Cor primária em hexadecimal');
    const secondaryPicker = screen.getByLabelText('Seletor de cor secundária');
    const secondaryHex = screen.getByLabelText('Cor secundária em hexadecimal');

    fireEvent.change(primaryPicker, { target: { value: '#123456' } });

    expect(primaryHex).toHaveValue('#123456');
    expect(screen.getByLabelText('Prévia da cor primária')).toHaveStyle({
      backgroundColor: 'rgb(18, 52, 86)',
    });

    fireEvent.change(primaryHex, { target: { value: '#ABCDEF' } });

    expect(primaryPicker).toHaveValue('#abcdef');
    expect(primaryHex).toHaveValue('#abcdef');
    expect(screen.getByLabelText('Prévia da cor primária')).toHaveStyle({
      backgroundColor: 'rgb(171, 205, 239)',
    });

    fireEvent.change(secondaryPicker, { target: { value: '#fedcba' } });

    expect(secondaryHex).toHaveValue('#fedcba');
    expect(screen.getByLabelText('Prévia da cor secundária')).toHaveStyle({
      backgroundColor: 'rgb(254, 220, 186)',
    });
  });

  it('shows the next tenant colors when the active company changes', () => {
    const onSaved = vi.fn(async () => undefined);
    const { rerender } = render(
      <CompanySettingsPage
        company={{ ...company, primaryColor: '#112233', secondaryColor: '#445566' }}
        onSaved={onSaved}
      />,
    );

    rerender(
      <CompanySettingsPage
        company={{
          ...company,
          id: 'tenant-horizonte',
          primaryColor: '#aabbcc',
          secondaryColor: '#ddeeff',
        }}
        onSaved={onSaved}
      />,
    );

    expect(screen.getByLabelText('Cor primária em hexadecimal')).toHaveValue('#aabbcc');
    expect(screen.getByLabelText('Cor secundária em hexadecimal')).toHaveValue('#ddeeff');
  });

  it('rejects invalid hexadecimal input before attempting to save', async () => {
    saveCompanyMock.mockClear();
    render(<CompanySettingsPage company={company} onSaved={vi.fn(async () => undefined)} />);

    fireEvent.change(screen.getByLabelText('Cor primária em hexadecimal'), {
      target: { value: '#12zz00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe uma cor hexadecimal válida com seis dígitos.',
    );
    expect(saveCompanyMock).not.toHaveBeenCalled();
  });

  it('confirms successful save and surfaces errors', async () => {
    saveCompanyMock.mockResolvedValueOnce({ saved: true });
    render(<CompanySettingsPage company={company} onSaved={vi.fn(async () => undefined)} />);

    fireEvent.change(screen.getByLabelText('Cor primária em hexadecimal'), {
      target: { value: '#123456' },
    });
    fireEvent.change(screen.getByLabelText('Cor secundária em hexadecimal'), {
      target: { value: 'ABCDEF' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Alterações salvas');
    expect(saveCompanyMock).toHaveBeenCalledWith(
      expect.objectContaining({ primaryColor: '#123456', secondaryColor: '#abcdef' }),
    );

    saveCompanyMock.mockRejectedValueOnce(new Error('save failure'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');
  });
});
