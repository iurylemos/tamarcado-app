import { cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  function renderCatalogPage(slug: string): ReturnType<typeof renderWithQueryClient> {
    return renderWithQueryClient(
      <MemoryRouter>
        <CompanyCatalogPage slug={slug} />
      </MemoryRouter>,
    );
  }

  it('shows service card skeletons while the catalog request is pending', () => {
    vi.mocked(getCompanyCatalog).mockReturnValue(new Promise(() => undefined));

    const { container } = renderCatalogPage('studio-aurora');

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

    const { container } = renderCatalogPage('studio-aurora');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar este catálogo.',
    );
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

  it('shows a distinct unavailable state when the catalog service is unavailable', async () => {
    vi.mocked(getCompanyCatalog).mockRejectedValue(
      Object.assign(new Error('service unavailable'), { code: 'unavailable' }),
    );

    renderCatalogPage('studio-aurora');

    expect(
      await screen.findByText('Este catálogo está temporariamente indisponível. Tente novamente.'),
    ).toBeInTheDocument();
  });

  it('shows an explicit not-found state when no published catalog matches the slug', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue(null);

    renderCatalogPage('slug-inexistente');

    expect(await screen.findByText('Empresa não encontrada.')).toBeInTheDocument();
  });

  it('rejects a malformed slug without rendering another business catalog', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue(null);

    renderCatalogPage('Slug/malformado');

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

    const { container } = renderCatalogPage('studio-aurora');

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

    const { unmount } = renderCatalogPage('studio-aurora');

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
          estimatedDeliveryEnabled: true,
          estimatedDeliveryDays: 15,
        },
      ],
      promotions: [
        {
          id: 'offer-product',
          name: 'Produto em oferta',
          imageUrl: '/offer.jpg',
          priceCents: 10000,
          promotionActive: true,
          estimatedDeliveryEnabled: true,
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
              estimatedDeliveryDays: 15,
            },
            {
              selections: [{ attributeId: 'color', optionId: 'red' }],
              priceCents: 11000,
              promotionalPriceCents: 9000,
              estimatedDeliveryDays: 30,
            },
          ],
          durationMinutes: 60,
        },
      ],
    });

    renderCatalogPage('studio-aurora');

    const offers = await screen.findByRole('region', { name: 'Ofertas' });
    const regularCatalog = screen.getByRole('region', { name: 'Serviços' });
    expect(offers.compareDocumentPosition(regularCatalog) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(offers).toHaveTextContent('Em promoção');
    expect(offers).toHaveTextContent('Cor: Azul');
    expect(offers).toHaveTextContent('Cor: Vermelho');
    expect(offers.querySelectorAll('.promotion-original-price')).toHaveLength(2);
    expect(offers.querySelectorAll('.promotion-card')).toHaveLength(1);
    expect(offers).toHaveTextContent(/R\$\s*150,00/);
    expect(offers).toHaveTextContent(/R\$\s*120,00/);
    expect(offers).toHaveTextContent(/R\$\s*110,00/);
    expect(offers).toHaveTextContent(/R\$\s*90,00/);
    expect(offers).toHaveTextContent('Prazo estimado · varia conforme a opção');
    expect(offers).not.toHaveTextContent('60 min');
    expect(screen.getByRole('heading', { name: 'Serviço regular' })).toBeInTheDocument();
    expect(regularCatalog).toHaveTextContent('Prazo estimado · 15 dias');
    expect(regularCatalog).not.toHaveTextContent('30 min');
  });

  it('ignores estimated delivery values attached to invalid combinations on both card surfaces', async () => {
    const product = {
      id: 'service-variants',
      name: 'Serviço com opções',
      imageUrl: '/service.jpg',
      priceCents: 5000,
      promotionActive: true,
      estimatedDeliveryEnabled: true,
      durationMinutes: 60,
      customizationAttributes: [
        {
          id: 'style',
          label: 'Estilo',
          options: [
            { id: 'classic', label: 'Clássico' },
            { id: 'modern', label: 'Moderno' },
          ],
          defaultOptionId: 'classic',
        },
      ],
      variantPrices: [
        {
          selections: [{ attributeId: 'style', optionId: 'classic' }],
          priceCents: 5000,
          promotionalPriceCents: 4000,
          estimatedDeliveryDays: 7,
        },
        {
          selections: [{ attributeId: 'style', optionId: 'modern' }],
          priceCents: 5000,
          promotionalPriceCents: 4500,
          estimatedDeliveryDays: 7,
        },
        {
          selections: [{ attributeId: 'style', optionId: 'missing-option' }],
          priceCents: 5000,
          promotionalPriceCents: 4500,
          estimatedDeliveryDays: 99,
        },
      ],
    };
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [product],
      promotions: [product],
    });

    renderCatalogPage('studio-aurora');

    const offers = await screen.findByRole('region', { name: 'Ofertas' });
    const regularCatalog = screen.getByRole('region', { name: 'Serviços' });
    expect(offers).toHaveTextContent('Prazo estimado · 7 dias');
    expect(regularCatalog).toHaveTextContent('Prazo estimado · 7 dias');
    expect(offers).not.toHaveTextContent('99 dias');
    expect(regularCatalog).not.toHaveTextContent('99 dias');
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

    renderCatalogPage('studio-aurora');

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
    const { unmount } = renderCatalogPage('studio-aurora');

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
