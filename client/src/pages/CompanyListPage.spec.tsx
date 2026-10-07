import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listPublicCompanies } from '../services/company.service';
import CompanyListPage from './CompanyListPage';
import { renderWithQueryClient } from '../test/render';
import { useCatalogFiltersStore } from '../stores/catalog-filters.store';

vi.mock('../services/company.service', () => ({ listPublicCompanies: vi.fn() }));
vi.mock('../services/product.service', () => ({ listPublicProducts: vi.fn(async () => []) }));

const companies = [
  {
    id: 'studio-aurora',
    name: 'Studio Aurora',
    slug: 'studio-aurora',
    segment: 'beauty' as const,
    description: 'SalÃ£o',
  },
  {
    id: 'clinica-horizonte',
    name: 'ClÃ­nica Horizonte',
    slug: 'clinica-horizonte',
    segment: 'health' as const,
  },
];

describe('CompanyListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCatalogFiltersStore.setState({ segment: '', tab: 'products', search: '' });
  });

  it('filters company discovery by segment and shows an empty state', async () => {
    vi.mocked(listPublicCompanies).mockImplementation(async (segment) =>
      segment ? [] : companies,
    );
    renderWithQueryClient(
      <MemoryRouter>
        <CompanyListPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Lojas' }));
    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bem-estar' }));
    expect(
      await screen.findByText('Nenhuma empresa encontrada neste segmento.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(listPublicCompanies).toHaveBeenLastCalledWith('fitness'));
  });
});

