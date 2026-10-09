import { describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';
import { getCompanyCatalog } from './catalog.service';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, name: string) => name),
  getDocs: vi.fn(),
  query: vi.fn((source, ...constraints) => ({ source, constraints })),
  where: vi.fn((field: string, _operator: string, value: unknown) => ({ field, value })),
}));

vi.mock('../config/firebase.config', () => ({ db: {} }));

describe('getCompanyCatalog', () => {
  it('starts business and service reads in parallel', () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    void getCompanyCatalog('studio-aurora');

    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  it('returns only active public products owned by the business matched by the slug', async () => {
    vi.mocked(getDocs)
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
      } as never);

    const catalog = await getCompanyCatalog('studio-aurora');

    expect(catalog?.business.slug).toBe('studio-aurora');
    expect(catalog?.products.map((product) => product.id)).toEqual(['service-aurora']);
    expect(getDocs).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        source: 'public_businesses',
        constraints: expect.arrayContaining([
          { field: 'slug', value: 'studio-aurora' },
          { field: 'published', value: true },
        ]),
      }),
    );
    expect(getDocs).toHaveBeenNthCalledWith(
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
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await expect(getCompanyCatalog('unknown-business')).resolves.toBeNull();
  });

  it('rejects malformed slugs before querying public catalog data', async () => {
    await expect(getCompanyCatalog('studio/aurora')).resolves.toBeNull();
    expect(getDocs).not.toHaveBeenCalled();
  });
});
