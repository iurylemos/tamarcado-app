import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveProduct } from './backoffice.service';

const mocks = vi.hoisted(() => ({ collection: vi.fn(), runTransaction: vi.fn() }));
vi.mock('./firestore.service', () => ({
  firestore: { collection: mocks.collection, runTransaction: mocks.runTransaction },
  professionalProductId: vi.fn(),
}));

describe('combo product persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes and preserves valid associations in internal and public product records', async () => {
    const comboItems = [
      { id: 'sofa', label: 'Sofá' },
      { id: 'chair', label: 'Poltrona' },
    ];
    const attributes = [
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
    const input = {
      id: 'combo',
      name: 'Combo',
      imageUrl: 'https://example.test/combo.jpg',
      priceCents: 10000,
      durationMinutes: 30,
      commissionType: 'percentage',
      commissionValue: 3500,
      active: true,
    };
    const writes: Record<string, Record<string, unknown>> = {};
    let existing: Record<string, unknown> = {
      tenantId: 'tenant',
      comboItems,
      customizationAttributes: attributes,
    };
    mocks.collection.mockImplementation((name: string) => ({
      doc: (id: string) => ({ id, path: `${name}/${id}` }),
    }));
    mocks.runTransaction.mockImplementation(async (callback) =>
      callback({
        get: async (ref: { path: string }) => ({
          exists: true,
          data: () =>
            ref.path === 'tenants/tenant'
              ? { slug: 'business', timezone: 'America/Sao_Paulo' }
              : existing,
        }),
        set: (ref: { path: string }, value: Record<string, unknown>) => {
          writes[ref.path] = value;
        },
      }),
    );

    await saveProduct('tenant', { ...input, comboItems, customizationAttributes: attributes });
    expect(writes['products/combo']).toMatchObject({
      comboItems,
      customizationAttributes: attributes,
    });
    expect(writes['public_products/combo']).toMatchObject({
      comboItems,
      customizationAttributes: attributes,
    });
    existing = { ...writes['products/combo'] };
    await saveProduct('tenant', input);
    expect(writes['products/combo']).toMatchObject({
      comboItems,
      customizationAttributes: attributes,
    });
    expect(writes['public_products/combo']).toMatchObject({
      comboItems,
      customizationAttributes: attributes,
    });
    await expect(saveProduct('tenant', { ...input, comboItems: [] })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });
});
