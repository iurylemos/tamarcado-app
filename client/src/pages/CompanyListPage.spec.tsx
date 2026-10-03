import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listPublicCompanies } from '../services/company.service';
import CompanyListPage from './CompanyListPage';

vi.mock('../services/company.service', () => ({ listPublicCompanies: vi.fn() }));

const companies = [
  {
    id: 'studio-aurora',
    name: 'Studio Aurora',
    slug: 'studio-aurora',
    segment: 'beauty' as const,
    description: 'Salão',
  },
  {
    id: 'clinica-horizonte',
    name: 'Clínica Horizonte',
    slug: 'clinica-horizonte',
    segment: 'health' as const,
  },
];

describe('CompanyListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters company discovery by segment and shows an empty state', async () => {
    vi.mocked(listPublicCompanies).mockImplementation(async (segment) =>
      segment ? [] : companies,
    );
    render(
      <MemoryRouter>
        <CompanyListPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por segmento'), {
      target: { value: 'fitness' },
    });
    expect(
      await screen.findByText('Nenhuma empresa encontrada neste segmento.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(listPublicCompanies).toHaveBeenLastCalledWith('fitness'));
  });
});
