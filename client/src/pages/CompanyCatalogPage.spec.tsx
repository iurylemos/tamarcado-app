import { cleanup, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogPage from './CompanyCatalogPage';
import { renderWithQueryClient } from '../test/render';

vi.mock('../services/catalog.service', () => ({
  getCompanyCatalog: vi.fn(),
}));

afterEach(cleanup);

describe('CompanyCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:company-manifest'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('shows service card skeletons while the catalog request is pending', () => {
    vi.mocked(getCompanyCatalog).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora']}>
        <Routes>
          <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Carregando catálogo');
    expect(screen.getByRole('status')).toHaveClass('skeleton-status');
    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(4);
    expect(container.querySelector('.app-loading-overlay')).not.toBeInTheDocument();
  });

  it('shows the catalog error without leaving loading skeletons', async () => {
    vi.mocked(getCompanyCatalog).mockRejectedValue(new Error('network error'));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora']}>
        <Routes>
          <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar este catálogo.',
    );
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

  it('shows a distinct empty catalog state after a successful empty response', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [],
    });

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora']}>
        <Routes>
          <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Esta empresa ainda não publicou serviços.'),
    ).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

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

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora']}>
        <Routes>
          <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();
    expect(document.querySelector('.skeleton-card')).not.toBeInTheDocument();
    expect(document.querySelector('link[rel="manifest"]')).toHaveAttribute(
      'href',
      'blob:company-manifest',
    );

    expect(screen.getByRole('heading', { name: 'Corte e finalização' })).toBeInTheDocument();

    expect(screen.getByText(/120,00/)).toBeInTheDocument();
    expect(screen.getByText(/60 min/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Corte e finalização/ })).toHaveAttribute(
      'href',
      '/empresa/studio-aurora/agendar/service-corte',
    );
    expect(
      screen.getByText('Agendamentos online com Tá Marcado').previousElementSibling,
    ).toHaveAttribute('src', '/pwa-icon.svg');
  });
});
