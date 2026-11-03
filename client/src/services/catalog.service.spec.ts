import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocsFromServer } from 'firebase/firestore';
import { getCompanyCatalog } from './catalog.service';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, name: string) => name),
  getDocsFromServer: vi.fn(),
  query: vi.fn((source, ...constraints) => ({ source, constraints })),
  where: vi.fn((field: string, _operator: string, value: unknown) => ({ field, value })),
  limit: vi.fn((value: number) => ({ limit: value })),
  orderBy: vi.fn(),
  startAfter: vi.fn(),
  documentId: vi.fn(),
}));

vi.mock('../config/firebase.config', () => ({ db: {} }));

describe('getCompanyCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDocsFromServer).mockReset();
  });

  it('lists products without fetching galleries', async () => {
    vi.mocked(getDocsFromServer)
      .mockResolvedValueOnce({
        docs: [{ id: 'tenant-aurora', data: () => ({ tenantId: 'tenant-aurora' }) }],
      } as never)
      .mockResolvedValue({ docs: [] } as never);

    const catalog = await getCompanyCatalog('studio-aurora', { pageSize: 10 });

    expect(getDocsFromServer).toHaveBeenCalledTimes(3);
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ source: 'public_products' }),
    );
    expect(catalog?.promotions).toEqual([]);
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        source: 'public_products',
        constraints: expect.arrayContaining([
          { field: 'businessSlug', value: 'studio-aurora' },
          { field: 'active', value: true },
          { field: 'published', value: true },
          { field: 'promotionActive', value: true },
        ]),
      }),
    );
  });

  it('loads a single product and its galleries in parallel with the business', async () => {
    vi.mocked(getDocsFromServer)
      .mockResolvedValueOnce({
        docs: [{ id: 'tenant-aurora', data: () => ({ tenantId: 'tenant-aurora' }) }],
      } as never)
      .mockResolvedValue({ docs: [] } as never);

    await getCompanyCatalog('studio-aurora', { productId: 'service-aurora' });

    expect(getDocsFromServer).toHaveBeenCalledTimes(3);
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        source: 'public_product_galleries',
        constraints: expect.arrayContaining([
          { field: 'businessSlug', value: 'studio-aurora' },
          { field: 'productId', value: 'service-aurora' },
          { field: 'published', value: true },
        ]),
      }),
    );
  });
  it('returns only active public products owned by the business matched by the slug', async () => {
    vi.mocked(getDocsFromServer)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'tenant-aurora',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Studio Aurora',
              slug: 'studio-aurora',
              segment: 'beauty',
            }),
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'service-aurora',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Corte',
              imageUrl: '/corte.jpg',
              priceCents: 12000,
              durationMinutes: 60,
              variantPrices: [
                {
                  selections: [{ attributeId: 'service', optionId: 'volume-brasileiro' }],
                  priceCents: 12000,
                },
              ],
            }),
          },
          {
            id: 'service-neighbor',
            data: () => ({
              tenantId: 'tenant-neighbor',
              name: 'Serviço de outro negócio',
              imageUrl: '/outro.jpg',
              priceCents: 8000,
              durationMinutes: 30,
            }),
          },
        ],
      } as never)
      .mockResolvedValueOnce({ docs: [] } as never);

    const catalog = await getCompanyCatalog('studio-aurora');

    expect(catalog?.business.slug).toBe('studio-aurora');
    expect(catalog?.products.map((product) => product.id)).toEqual(['service-aurora']);
    expect(catalog?.products[0]?.variantPrices).toEqual([
      {
        selections: [{ attributeId: 'service', optionId: 'volume-brasileiro' }],
        priceCents: 12000,
      },
    ]);
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        source: 'public_businesses',
        constraints: expect.arrayContaining([
          { field: 'slug', value: 'studio-aurora' },
          { field: 'published', value: true },
        ]),
      }),
    );
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        source: 'public_products',
        constraints: expect.arrayContaining([
          { field: 'businessSlug', value: 'studio-aurora' },
          { field: 'active', value: true },
          { field: 'published', value: true },
        ]),
      }),
    );
  });

  it('returns valid active offers for the matching tenant without changing catalog pagination', async () => {
    vi.mocked(getDocsFromServer)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'tenant-aurora',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Studio Aurora',
              slug: 'studio-aurora',
              segment: 'beauty',
            }),
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'regular-service',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Serviço regular',
              imageUrl: '/regular.jpg',
              priceCents: 5000,
              durationMinutes: 30,
            }),
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'valid-offer',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Oferta válida',
              imageUrl: '/offer.jpg',
              priceCents: 12000,
              promotionalPriceCents: 9000,
              promotionActive: true,
              active: true,
              published: true,
              durationMinutes: 60,
            }),
          },
          {
            id: 'invalid-price',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Oferta inválida',
              imageUrl: '/invalid.jpg',
              priceCents: 12000,
              promotionalPriceCents: 12000,
              promotionActive: true,
              active: true,
              published: true,
              durationMinutes: 60,
            }),
          },
          {
            id: 'another-tenant',
            data: () => ({
              tenantId: 'tenant-neighbor',
              name: 'Oferta de outra empresa',
              imageUrl: '/neighbor.jpg',
              priceCents: 12000,
              promotionalPriceCents: 9000,
              promotionActive: true,
              active: true,
              published: true,
              durationMinutes: 60,
            }),
          },
          {
            id: 'inactive-offer',
            data: () => ({
              tenantId: 'tenant-aurora',
              name: 'Oferta inativa',
              imageUrl: '/inactive.jpg',
              priceCents: 12000,
              promotionalPriceCents: 9000,
              promotionActive: false,
              active: true,
              published: true,
              durationMinutes: 60,
            }),
          },
        ],
      } as never);

    const catalog = await getCompanyCatalog('studio-aurora', { pageSize: 10 });

    expect(catalog?.products.map((product) => product.id)).toEqual(['regular-service']);
    expect(catalog?.promotions.map((product) => product.id)).toEqual(['valid-offer']);
    expect(catalog?.promotions[0]).toMatchObject({
      priceCents: 12000,
      promotionalPriceCents: 9000,
      promotionActive: true,
    });
  });

  it('does not return catalog data when no published business matches the slug', async () => {
    vi.mocked(getDocsFromServer).mockResolvedValue({ docs: [] } as never);

    await expect(getCompanyCatalog('unknown-business')).resolves.toBeNull();
  });

  it('rejects malformed slugs before querying public catalog data', async () => {
    await expect(getCompanyCatalog('studio/aurora')).resolves.toBeNull();
    expect(getDocsFromServer).not.toHaveBeenCalled();
  });
});
