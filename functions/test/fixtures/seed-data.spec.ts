import { describe, expect, it } from 'vitest';
import { createSeedDocuments, seedUsers } from './seed-data';

describe('shared seed data', () => {
  const documents = createSeedDocuments(new Date('2026-10-09T12:00:00.000Z'));
  const findDocument = (collection: string, id: string) =>
    documents.find((document) => document.collection === collection && document.id === id);

  const isCatalogProduct = (
    document: (typeof documents)[number],
  ): document is (typeof documents)[number] & {
    data: { name: string; priceCents: number; durationMinutes: number };
  } =>
    typeof document.data.name === 'string' &&
    typeof document.data.priceCents === 'number' &&
    typeof document.data.durationMinutes === 'number';

  it('publishes the furniture seller and its sofa and upholstered headboard', () => {
    expect(findDocument('tenants', 'tenant-casa-nativa')?.data).toMatchObject({
      name: 'Casa Nativa Móveis',
      slug: 'casa-nativa-moveis',
      active: true,
    });
    expect(findDocument('public_businesses', 'tenant-casa-nativa')?.data).toMatchObject({
      tenantId: 'tenant-casa-nativa',
      slug: 'casa-nativa-moveis',
      published: true,
    });

    for (const [id, name] of [
      ['product-sofa-modular', 'Sofá modular Nativa'],
      ['product-headboard-upholstered', 'Cabeceira estofada Nativa'],
    ] as const) {
      const product = findDocument('products', id);
      const publicProduct = findDocument('public_products', id);

      expect(product?.data).toMatchObject({
        tenantId: 'tenant-casa-nativa',
        name,
        active: true,
      });
      expect(publicProduct?.data).toMatchObject({
        tenantId: 'tenant-casa-nativa',
        businessSlug: 'casa-nativa-moveis',
        name,
        imageUrl: expect.stringContaining('images.unsplash.com'),
        published: true,
      });
      expect(publicProduct?.data.customizationAttributes).toEqual(
        product?.data.customizationAttributes,
      );
      expect(publicProduct?.data).not.toHaveProperty('defaultImages');
    }
  });

  it('keeps furniture options and demo accounts consistent across both seed commands', () => {
    const sofa = findDocument('products', 'product-sofa-modular')?.data;
    const headboard = findDocument('products', 'product-headboard-upholstered')?.data;

    expect(sofa?.customizationAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'fabric',
          defaultOptionId: 'fabric-suede',
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'fabric-linen', label: 'Linho Areia' }),
            expect.objectContaining({ id: 'fabric-suede', label: 'Suede Grafite' }),
          ]),
        }),
        expect.objectContaining({
          id: 'seats',
          defaultOptionId: 'seats-three',
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'seats-two', label: '2 lugares' }),
            expect.objectContaining({ id: 'seats-three', label: '3 lugares' }),
          ]),
        }),
      ]),
    );
    expect(headboard?.customizationAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'size',
          defaultOptionId: 'size-queen',
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'size-double', label: 'Casal' }),
            expect.objectContaining({ id: 'size-queen', label: 'Queen' }),
            expect.objectContaining({ id: 'size-king', label: 'King' }),
          ]),
        }),
      ]),
    );
    expect(
      documents
        .filter(
          (document) =>
            document.collection === 'professional_products' &&
            document.data.tenantId === 'tenant-casa-nativa',
        )
        .map((document) => document.data.productId),
    ).toEqual(['product-sofa-modular', 'product-headboard-upholstered']);
    expect(seedUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uid: 'test-backoffice-casa-nativa',
          email: 'admin@casanativa.test',
          tenantId: 'tenant-casa-nativa',
        }),
        expect.objectContaining({
          uid: 'test-collaborator-casa-nativa',
          email: 'rafael@casanativa.test',
          tenantId: 'tenant-casa-nativa',
        }),
        expect.objectContaining({
          uid: 'test-backoffice-vitoria-moura-beauty',
          email: 'admin@vitoriamourabeauty.com',
          tenantId: 'tenant-vitoria-moura-beauty',
          role: 'backoffice',
        }),
      ]),
    );
    expect(findDocument('users', 'test-backoffice-vitoria-moura-beauty')?.data).toMatchObject({
      tenantId: 'tenant-vitoria-moura-beauty',
      role: 'backoffice',
      name: 'Gestor Vitória Moura Beauty',
      phoneE164: '',
      email: 'admin@vitoriamourabeauty.com',
      active: true,
    });
  });

  it('seeds four Vitória Moura Beauty products with complete variant prices', () => {
    const tenantId = 'tenant-vitoria-moura-beauty';
    const professionalId = 'professional-vitoria-moura';
    const products = documents
      .filter(
        (document) => document.collection === 'products' && document.data.tenantId === tenantId,
      )
      .filter(isCatalogProduct)
      .map((document) => ({
        id: document.id,
        name: document.data.name,
        priceCents: document.data.priceCents,
        durationMinutes: document.data.durationMinutes,
      }));
    const publicProducts = documents.filter(
      (document) =>
        document.collection === 'public_products' &&
        document.data.tenantId === tenantId &&
        document.data.active === true,
    );
    const professionalProductIds = documents
      .filter(
        (document) =>
          document.collection === 'professional_products' &&
          document.data.tenantId === tenantId &&
          document.data.professionalId === professionalId &&
          document.data.active === true,
      )
      .map((document) => document.data.productId);
    const variantPricesFor = (productId: string) =>
      findDocument('products', productId)?.data.variantPrices as
        | Array<{
            selections: Array<{ attributeId: string; optionId: string }>;
            priceCents: number;
          }>
        | undefined;

    expect(findDocument('tenants', tenantId)?.data).toMatchObject({
      name: 'Vitória Moura Beauty',
      slug: 'vitoria-moura-beauty',
      segment: 'beauty',
      description: 'Brilhe através do Seu olhar',
      active: true,
    });
    expect(findDocument('public_businesses', tenantId)?.data).toMatchObject({
      tenantId,
      name: 'Vitória Moura Beauty',
      slug: 'vitoria-moura-beauty',
      description: 'Brilhe através do Seu olhar',
      published: true,
    });
    expect(findDocument('professionals', professionalId)?.data).toMatchObject({
      tenantId,
      name: 'Vitória Moura',
      active: true,
    });

    expect(
      products.map(({ id, name, priceCents, durationMinutes }) => [
        id,
        name,
        priceCents,
        durationMinutes,
      ]),
    ).toEqual([
      ['service-vitoria-brows', 'Sobrancelhas', 2500, 60],
      ['service-vitoria-lashes', 'Cílios', 10000, 120],
      ['service-vitoria-maintenance', 'Manutenção', 8500, 60],
      ['service-vitoria-combo', 'Cílios + Sobrancelhas', 11500, 180],
    ]);
    expect(variantPricesFor('service-vitoria-brows')?.map(({ priceCents }) => priceCents)).toEqual([
      2500, 4000, 5000, 8000,
    ]);
    expect(variantPricesFor('service-vitoria-lashes')?.map(({ priceCents }) => priceCents)).toEqual(
      [10000, 9000, 12000, 12000, 14000, 14000],
    );
    expect(
      variantPricesFor('service-vitoria-maintenance')?.map(({ priceCents }) => priceCents),
    ).toEqual([8500, 8500, 9500, 10000]);
    const comboPrices = variantPricesFor('service-vitoria-combo');
    expect(comboPrices).toHaveLength(20);
    expect(
      comboPrices?.map(({ selections }) => selections.map(({ optionId }) => optionId).join('+')),
    ).toEqual(
      ['design', 'design-henna', 'design-tintura', 'brow-lamination'].flatMap((browId) =>
        [
          'volume-express',
          'volume-brasileiro',
          'volume-intermediario',
          'volume-ingles',
          'volume-fox',
        ].map((lashId) => `${browId}+${lashId}`),
      ),
    );
    expect(comboPrices?.map(({ priceCents }) => priceCents)).toEqual([
      11500, 14500, 14500, 16500, 16500, 13000, 16000, 16000, 18000, 18000, 14000, 17000, 17000,
      19000, 19000, 17000, 20000, 20000, 22000, 22000,
    ]);
    const browPriceById = new Map(
      variantPricesFor('service-vitoria-brows')?.map(({ selections, priceCents }) => [
        selections[0]!.optionId,
        priceCents,
      ]),
    );
    const lashPriceById = new Map(
      variantPricesFor('service-vitoria-lashes')?.map(({ selections, priceCents }) => [
        selections[0]!.optionId,
        priceCents,
      ]),
    );
    expect(
      comboPrices?.map(({ selections, priceCents }) => [
        priceCents,
        (browPriceById.get(selections[0]!.optionId) ?? 0) +
          (lashPriceById.get(selections[1]!.optionId) ?? 0),
      ]),
    ).toEqual(comboPrices?.map(({ priceCents }) => [priceCents, priceCents]));
    expect(findDocument('products', 'service-vitoria-combo')?.data.customizationAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'brow-service', defaultOptionId: 'design' }),
        expect.objectContaining({
          id: 'lash-service',
          defaultOptionId: 'volume-express',
          options: expect.not.arrayContaining([expect.objectContaining({ id: 'lash-lifting' })]),
        }),
      ]),
    );

    expect(publicProducts).toHaveLength(4);
    for (const product of products) {
      expect(findDocument('public_products', product.id)?.data).toMatchObject({
        tenantId,
        businessSlug: 'vitoria-moura-beauty',
        name: product.name,
        durationMinutes: product.durationMinutes,
        published: true,
        variantPrices: findDocument('products', product.id)?.data.variantPrices,
      });
    }
    expect(professionalProductIds).toEqual(products.map((product) => product.id));
    expect(
      documents.some(
        (document) =>
          document.collection === 'products' &&
          document.data.tenantId === tenantId &&
          document.data.active === false,
      ),
    ).toBe(false);
    expect(
      documents.filter(
        (document) =>
          document.collection === 'working_hours' &&
          document.data.tenantId === tenantId &&
          document.data.professionalId === professionalId,
      ),
    ).toHaveLength(6);
  });
});
