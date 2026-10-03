import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogPage from './CompanyCatalogPage';

vi.mock('../services/catalog.service', () => ({
  getCompanyCatalog: vi.fn(),
}));

describe('CompanyCatalogPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders only the active products returned by the public catalog', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [
        {
          id: 'service-corte',
          name: 'Corte e finalização',
          imageUrl: '/corte.jpg',
          priceCents: 12000,
          durationMinutes: 60,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/empresa/studio-aurora']}>
        <Routes>
          <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Corte e finalização' })).toBeInTheDocument();

    expect(
      screen.getByText((content) => content.includes('R$ 120,00 · 60 min')),
    ).toBeInTheDocument();
  });
});
