import { cleanup, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCompanyCatalog } from './services/catalog.service';
import { listAvailability } from './services/availability.service';
import { App } from './App';
import { renderWithQueryClient } from './test/render';

vi.mock('./services/catalog.service', () => ({ getCompanyCatalog: vi.fn() }));
vi.mock('./services/availability.service', () => ({ listAvailability: vi.fn(async () => []) }));

afterEach(cleanup);

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
    vi.mocked(listAvailability).mockResolvedValue([]);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:company-manifest'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('opens an installed company entry at its catalog and links to its booking route', async () => {
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
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Corte e finalização/ })).toHaveAttribute(
      'href',
      '/empresa/studio-aurora/agendar/service-corte',
    );
  });

  it('opens the booking route directly from a company-specific app entry', async () => {
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
    vi.mocked(listAvailability).mockReturnValue(new Promise(() => undefined));

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Seu próximo momento começa aqui.' }),
      ).toBeInTheDocument(),
    );
  });

  it('shows neutral guidance at the root without company or service discovery', async () => {
    renderWithQueryClient(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Acesse o catálogo do seu negócio' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(getCompanyCatalog).not.toHaveBeenCalled();
  });

  it('does not offer to install an unscoped app from the neutral root', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      platform: 'iPhone',
      maxTouchPoints: 1,
      standalone: false,
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Acesse o catálogo do seu negócio' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar app' })).not.toBeInTheDocument();
  });
});
