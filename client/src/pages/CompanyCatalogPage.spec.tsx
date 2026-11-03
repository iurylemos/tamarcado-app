import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogPage from './CompanyCatalogPage';
import { renderWithQueryClient } from '../test/render';

vi.mock('../services/catalog.service', () => ({
  getCompanyCatalog: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

    const { container } = renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando catálogo');
    expect(screen.getByRole('status')).toHaveClass('skeleton-status');
    expect(screen.getByRole('heading', { name: 'Serviços disponíveis' })).toBeInTheDocument();
    expect(screen.getByText('Encontre seu próximo horário')).toBeInTheDocument();
    expect(container.querySelector('.company-identity')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.catalog-section')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(4);
    expect(container.querySelectorAll('.catalog-grid > div')).toHaveLength(4);
    expect(container.querySelectorAll('.catalog-grid .skeleton-card__image')).toHaveLength(0);
    expect(
      container.querySelectorAll('.catalog-grid .skeleton-card__image-placeholder'),
    ).toHaveLength(4);
    expect(container.querySelector('.app-loading-overlay')).not.toBeInTheDocument();
  });

  it('shows the catalog error without leaving loading skeletons', async () => {
    vi.mocked(getCompanyCatalog).mockRejectedValue(new Error('network error'));

    const { container } = renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar este catálogo.',
    );
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

  it('shows a distinct unavailable state when the catalog service is unavailable', async () => {
    vi.mocked(getCompanyCatalog).mockRejectedValue(
      Object.assign(new Error('service unavailable'), { code: 'unavailable' }),
    );

    renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    expect(
      await screen.findByText('Este catálogo está temporariamente indisponível. Tente novamente.'),
    ).toBeInTheDocument();
  });

  it('shows an explicit not-found state when no published catalog matches the slug', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue(null);

    renderWithQueryClient(<CompanyCatalogPage slug="slug-inexistente" />);

    expect(await screen.findByText('Empresa não encontrada.')).toBeInTheDocument();
  });

  it('rejects a malformed slug without rendering another business catalog', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue(null);

    renderWithQueryClient(<CompanyCatalogPage slug="Slug/malformado" />);

    expect(await screen.findByText('Empresa não encontrada.')).toBeInTheDocument();
    expect(getCompanyCatalog).toHaveBeenCalledWith('Slug/malformado', {
      pageSize: 10,
      after: undefined,
    });
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

    const { container } = renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

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
    const openGraphTitle = document.createElement('meta');
    openGraphTitle.setAttribute('property', 'og:title');
    openGraphTitle.setAttribute('content', 'Tá Marcado | Catálogos de negócios');
    document.head.append(openGraphTitle);

    const { unmount } = renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();
    expect(document.querySelector('.skeleton-card')).not.toBeInTheDocument();
    expect(document.querySelector('link[rel="manifest"]')).toHaveAttribute(
      'href',
      'blob:company-manifest',
    );
    expect(document.title).toBe('Studio Aurora | Tá Marcado');
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Studio Aurora | Tá Marcado',
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

    unmount();
    expect(openGraphTitle).toHaveAttribute('content', 'Tá Marcado | Catálogos de negócios');
    openGraphTitle.remove();
  });

  it('shows active promotions ahead of the regular catalog with prices per variant', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [
        {
          id: 'regular-service',
          name: 'Serviço regular',
          imageUrl: '/regular.jpg',
          priceCents: 5000,
          durationMinutes: 30,
        },
      ],
      promotions: [
        {
          id: 'offer-product',
          name: 'Produto em oferta',
          imageUrl: '/offer.jpg',
          priceCents: 10000,
          promotionActive: true,
          customizationAttributes: [
            {
              id: 'color',
              label: 'Cor',
              options: [
                { id: 'blue', label: 'Azul' },
                { id: 'red', label: 'Vermelho' },
              ],
              defaultOptionId: 'blue',
            },
          ],
          variantPrices: [
            {
              selections: [{ attributeId: 'color', optionId: 'blue' }],
              priceCents: 15000,
              promotionalPriceCents: 12000,
            },
            {
              selections: [{ attributeId: 'color', optionId: 'red' }],
              priceCents: 11000,
              promotionalPriceCents: 9000,
            },
          ],
          durationMinutes: 60,
        },
      ],
    });

    renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    const offers = await screen.findByRole('region', { name: 'Ofertas' });
    const regularCatalog = screen.getByRole('region', { name: 'Serviços' });
    expect(offers.compareDocumentPosition(regularCatalog) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(offers).toHaveTextContent('Em promoção');
    expect(offers).toHaveTextContent('Cor: Azul');
    expect(offers).toHaveTextContent('Cor: Vermelho');
    expect(offers.querySelectorAll('.promotion-original-price')).toHaveLength(2);
    expect(offers).toHaveTextContent(/R\$\s*150,00/);
    expect(offers).toHaveTextContent(/R\$\s*120,00/);
    expect(offers).toHaveTextContent(/R\$\s*110,00/);
    expect(offers).toHaveTextContent(/R\$\s*90,00/);
    expect(screen.getByRole('heading', { name: 'Serviço regular' })).toBeInTheDocument();
  });

  it('offers a business-named PWA install prompt only after a valid catalog loads', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      platform: 'iPhone',
      maxTouchPoints: 1,
      standalone: false,
    });
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [],
    });

    renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    expect(
      await screen.findByRole('complementary', { name: 'Instalar catálogo de Studio Aurora' }),
    ).toHaveTextContent('Tenha o catálogo de Studio Aurora na tela inicial do seu iPhone.');
  });

  it('removes the generated manifest and restores document metadata when leaving the catalog', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [],
    });

    const originalTitle = document.title;
    const { unmount } = renderWithQueryClient(<CompanyCatalogPage slug="studio-aurora" />);

    expect(
      await screen.findByText('Esta empresa ainda não publicou serviços.'),
    ).toBeInTheDocument();
    expect(document.querySelector('link[rel="manifest"]')).toHaveAttribute(
      'href',
      'blob:company-manifest',
    );

    unmount();

    expect(document.querySelector('link[rel="manifest"]')).not.toBeInTheDocument();
    expect(document.title).toBe(originalTitle);
  });
});
