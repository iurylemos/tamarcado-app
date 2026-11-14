import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPublicAppointment } from './booking.service';
import { findBookableProduct, findPublicBusiness } from './public-catalog.service';
import { isRequestedSlotAvailable } from './availability.service';

const mocks = vi.hoisted(() => ({
  collection: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock('./firestore.service', () => ({
  firestore: { collection: mocks.collection, runTransaction: mocks.runTransaction },
  professionalProductId: () => 'association',
}));
vi.mock('./public-catalog.service', () => ({
  findBookableProduct: vi.fn(),
  findPublicBusiness: vi.fn(),
}));
vi.mock('./availability.service', () => ({
  isRequestedSlotAvailable: vi.fn(),
  searchAvailability: vi.fn(),
}));

describe('combo booking snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists trusted item names and selections independently of later product edits', async () => {
    const comboItems = [
      { id: 'sofa', label: 'Sofá' },
      { id: 'chair', label: 'Poltrona' },
    ];
    const attributes = [
      {
        id: 'color',
        label: 'Cor do sofá',
        comboItemId: 'sofa',
        defaultOptionId: 'beige',
        options: [
          { id: 'beige', label: 'Bege' },
          { id: 'gray', label: 'Cinza' },
        ],
      },
    ];
    vi.mocked(findPublicBusiness).mockResolvedValue({
      id: 'tenant',
      tenantId: 'tenant',
      slug: 'business',
      name: 'Business',
      segment: 'home',
      published: true,
    });
    vi.mocked(findBookableProduct).mockResolvedValue({
      id: 'combo',
      tenantId: 'tenant',
      businessSlug: 'business',
      name: 'Combo',
      active: true,
      published: true,
      imageUrl: 'https://example.test/combo.jpg',
      priceCents: 10000,
      durationMinutes: 30,
      commissionType: 'percentage',
      commissionValue: 3500,
      comboItems,
      customizationAttributes: attributes,
    });
    vi.mocked(isRequestedSlotAvailable).mockResolvedValue(true);
    const stored: Record<string, unknown> = {};
    const records: Record<string, Record<string, unknown>> = {
      'tenants/tenant': { active: true, timezone: 'America/Sao_Paulo', bookingIntervalMinutes: 15 },
      'public_products/combo': {
        tenantId: 'tenant',
        businessSlug: 'business',
        active: true,
        published: true,
      },
      'professionals/pro': { tenantId: 'tenant', active: true, name: 'Profissional' },
      'professional_products/association': { tenantId: 'tenant', active: true },
    };
    mocks.collection.mockImplementation((name: string) => ({
      doc: (id: string) => {
        const path = `${name}/${id}`;
        return {
          path,
          get: async () => ({ exists: !!records[path], data: () => records[path] }),
        };
      },
    }));
    mocks.runTransaction.mockImplementation(async (callback) =>
      callback({
        get: async () => ({ exists: false }),
        create: (ref: { path: string }, value: Record<string, unknown>) => {
          stored[ref.path] = JSON.parse(JSON.stringify(value));
        },
      }),
    );

    const result = await createPublicAppointment({
      businessSlug: 'business',
      productId: 'combo',
      professionalId: 'pro',
      startsAt: '2035-02-04T12:00:00.000Z',
      customerName: 'Cliente',
      customerPhone: '(11) 99999-0000',
      paymentMethod: 'debit',
      customizationSelections: [
        {
          attributeId: 'color',
          optionId: 'gray',
          attributeLabel: 'Não confiável',
          comboItemId: 'chair',
        },
      ],
    });
    comboItems[0]!.label = 'Alterado';
    attributes[0]!.label = 'Alterado';
    expect(stored[`appointments/${result.appointmentId}`]).toMatchObject({
      comboItemsSnapshot: [
        { id: 'sofa', label: 'Sofá' },
        { id: 'chair', label: 'Poltrona' },
      ],
      customizationSnapshot: [
        {
          attributeId: 'color',
          attributeLabel: 'Cor do sofá',
          comboItemId: 'sofa',
          optionId: 'gray',
          optionLabel: 'Cinza',
        },
      ],
      productPriceCentsSnapshot: 10000,
    });
  });
});
