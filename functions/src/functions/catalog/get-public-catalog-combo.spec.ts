import { describe, expect, it, vi } from 'vitest';
import { getPublicCatalog } from './get-public-catalog';
import {
  findPublicBusiness,
  listPublicProductRecords,
} from '../../services/public-catalog.service';

vi.mock('../../services/public-catalog.service', () => ({
  findPublicBusiness: vi.fn(),
  listPublicProductRecords: vi.fn(),
}));

describe('public combo catalog', () => {
  it('returns item associations without exposing internal product fields', async () => {
    vi.mocked(findPublicBusiness).mockResolvedValue({
      id: 'public',
      tenantId: 'tenant',
      slug: 'business',
      name: 'Business',
      segment: 'home',
      published: true,
    });
    const comboItems = [
      { id: 'sofa', label: 'Sofá' },
      { id: 'chair', label: 'Poltrona' },
    ];
    const customizationAttributes = [
      {
        id: 'color',
        label: 'Cor',
        comboItemId: 'sofa',
        defaultOptionId: 'beige',
        options: [
          { id: 'beige', label: 'Bege' },
          { id: 'gray', label: 'Cinza' },
        ],
      },
    ];
    vi.mocked(listPublicProductRecords).mockResolvedValue([
      {
        id: 'combo',
        tenantId: 'tenant',
        businessSlug: 'business',
        name: 'Combo',
        imageUrl: 'https://example.test/combo.jpg',
        priceCents: 10000,
        durationMinutes: 30,
        active: true,
        published: true,
        comboItems,
        customizationAttributes,
      },
    ]);
    const result = await getPublicCatalog.run({
      data: { businessSlug: 'business' },
      rawRequest: {},
      acceptsStreaming: false,
    } as never);
    expect(result.products[0]).toMatchObject({ comboItems, customizationAttributes });
    expect(result.products[0]).not.toHaveProperty('tenantId');
  });
});
