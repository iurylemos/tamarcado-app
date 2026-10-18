import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocsFromServer } from 'firebase/firestore';
import { getCompanyCatalog } from './catalog.service';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, name: string) => name),
  getDocsFromServer: vi.fn(),
  query: vi.fn((source, ...constraints) => ({ source, constraints })),
  where: vi.fn((field: string, _operator: string, value: unknown) => ({ field, value })),
  limit: vi.fn((value: number) => ({ limit: value })),
}));

vi.mock('../config/firebase.config', () => ({ db: {} }));

describe('getCompanyCatalog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads product and gallery metadata in parallel after resolving the business', async () => {
    vi.mocked(getDocsFromServer)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'tenant-aurora',
            data: () => ({ tenantId: 'tenant-aurora' }),
          },
        ],
      } as never)
      .mockResolvedValue({ docs: [] } as never);

    await getCompanyCatalog('studio-aurora');

    expect(getDocsFromServer).toHaveBeenCalledTimes(3);
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ source: 'public_products' }),
    );
    expect(getDocsFromServer).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        source: 'public_product_galleries',
        constraints: expect.arrayContaining([
          { field: 'tenantId', value: 'tenant-aurora' },
          { field: 'businessSlug', value: 'studio-aurora' },
          { field: 'published', value: true },
          { limit: 500 },
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

  it('does not return catalog data when no published business matches the slug', async () => {
    vi.mocked(getDocsFromServer).mockResolvedValue({ docs: [] } as never);

    await expect(getCompanyCatalog('unknown-business')).resolves.toBeNull();
  });

  it('rejects malformed slugs before querying public catalog data', async () => {
    await expect(getCompanyCatalog('studio/aurora')).resolves.toBeNull();
    expect(getDocsFromServer).not.toHaveBeenCalled();
  });
});
