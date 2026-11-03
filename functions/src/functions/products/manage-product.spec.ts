import { describe, expect, it } from 'vitest';
import { afterAll, beforeEach, describe as describeVitest, it as itVitest } from 'vitest';
import { randomUUID } from 'node:crypto';
import { collections } from '../../config/collections';
import { firestore } from '../../services/firestore.service';
import {
  deleteProductGallery,
  saveProduct,
  saveProductGallery,
  validateProductInput,
} from '../../services/backoffice.service';
import { findPublicBusiness } from '../../services/public-catalog.service';
import { productGalleryDocumentId } from '../../model/product-gallery.model';
import { getPublicCatalog } from '../catalog/get-public-catalog';

const validProduct = {
  name: 'Corte e finalização',
  imageUrl: 'https://images.example.test/corte.jpg',
  priceCents: 12000,
  durationMinutes: 60,
  commissionType: 'percentage',
  commissionValue: 3500,
  active: true,
};

describe('product administration validation', () => {
  it.each([
    ['negative price', { priceCents: -1 }],
    ['fractional price', { priceCents: 1200.5 }],
    ['zero duration', { durationMinutes: 0 }],
    ['unsupported commission type', { commissionType: 'other' }],
    ['negative commission', { commissionValue: -1 }],
    ['commission over 100 percent', { commissionValue: 10001 }],
    ['non-HTTP image URL', { imageUrl: 'javascript:alert(1)' }],
  ])('rejects %s', async (_label, changes) => {
    let failure: unknown;
    try {
      validateProductInput({ ...validProduct, ...changes });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ code: 'invalid-argument' });
  });

  it('accepts the zero-price and zero-commission boundaries before persistence', async () => {
    expect(
      validateProductInput({
        ...validProduct,
        priceCents: 0,
        commissionValue: 0,
      }),
    ).toMatchObject({ priceCents: 0, commissionValue: 0 });
  });

  it('preserves image and active state in the validated product payload', () => {
    expect(validateProductInput(validProduct)).toMatchObject({
      imageUrl: validProduct.imageUrl,
      commissionType: 'percentage',
      commissionValue: 3500,
      active: true,
    });
  });

  it('accepts a legacy URL image without allowing empty paths for uploaded images', () => {
    expect(
      validateProductInput({
        ...validProduct,
        defaultImages: [
          {
            id: 'legacy-image',
            storagePath: '',
            downloadUrl: validProduct.imageUrl,
          },
        ],
      }),
    ).toMatchObject({ defaultImages: [{ id: 'legacy-image', storagePath: '' }] });
    expect(() =>
      validateProductInput({
        ...validProduct,
        defaultImages: [{ id: 'new-image', storagePath: '', downloadUrl: validProduct.imageUrl }],
      }),
    ).toThrow(/Caminho da imagem é obrigatório/);
  });

  it('accepts optional empty customization and rejects invalid option/default definitions', () => {
    expect(validateProductInput({ ...validProduct, customizationAttributes: [] })).toMatchObject({
      customizationAttributes: [],
    });
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes: [
          {
            id: 'color',
            label: 'Cor',
            options: [{ id: 'brown', label: 'Castanho' }],
            defaultOptionId: 'brown',
          },
        ],
      }),
    ).toThrow(/pelo menos duas opções/);
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes: [
          {
            id: 'color',
            label: 'Cor',
            options: [
              { id: 'brown', label: 'Castanho' },
              { id: 'brown', label: 'Loiro' },
            ],
            defaultOptionId: 'brown',
          },
        ],
      }),
    ).toThrow(/identificadores e nomes únicos/);
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes: [
          {
            id: 'color',
            label: 'Cor',
            options: [
              { id: 'brown', label: 'Castanho' },
              { id: 'blonde', label: 'Loiro' },
            ],
            defaultOptionId: 'missing',
          },
        ],
      }),
    ).toThrow(/opção padrão deve pertencer/);
  });

  it('validates a complete, unique price table for every customization combination', () => {
    const customizationAttributes = [
      {
        id: 'color',
        label: 'Cor',
        options: [
          { id: 'brown', label: 'Castanho' },
          { id: 'blonde', label: 'Loiro' },
        ],
        defaultOptionId: 'brown',
      },
      {
        id: 'fabric',
        label: 'Tecido',
        options: [
          { id: 'linen', label: 'Linho' },
          { id: 'velvet', label: 'Veludo' },
        ],
        defaultOptionId: 'linen',
      },
    ];
    const variantPrices = [
      {
        selections: [
          { attributeId: 'color', optionId: 'brown' },
          { attributeId: 'fabric', optionId: 'linen' },
        ],
        priceCents: 10000,
      },
      {
        selections: [
          { attributeId: 'color', optionId: 'brown' },
          { attributeId: 'fabric', optionId: 'velvet' },
        ],
        priceCents: 11000,
      },
      {
        selections: [
          { attributeId: 'color', optionId: 'blonde' },
          { attributeId: 'fabric', optionId: 'linen' },
        ],
        priceCents: 12000,
      },
      {
        selections: [
          { attributeId: 'color', optionId: 'blonde' },
          { attributeId: 'fabric', optionId: 'velvet' },
        ],
        priceCents: 13000,
      },
    ];

    expect(
      validateProductInput({ ...validProduct, customizationAttributes, variantPrices })
        .variantPrices,
    ).toEqual(variantPrices);
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes,
        variantPrices: variantPrices.slice(0, -1),
      }),
    ).toThrow(/exatamente um preço/);
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes,
        variantPrices: [...variantPrices.slice(0, -1), variantPrices[0]],
      }),
    ).toThrow(/exatamente um preço/);
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes,
        variantPrices: variantPrices.map((price, index) =>
          index === 0 ? { ...price, priceCents: -1 } : price,
        ),
      }),
    ).toThrow(/Preço da combinação em centavos/);
    expect(
      validateProductInput({
        ...validProduct,
        customizationAttributes,
        variantPrices: null,
      }).variantPrices,
    ).toBeNull();
  });

  it('accepts and normalizes a valid active product promotion', () => {
    expect(
      validateProductInput({
        ...validProduct,
        promotionActive: true,
        promotionalPriceCents: 9000,
      }),
    ).toMatchObject({
      promotionActive: true,
      promotionalPriceCents: 9000,
    });
  });

  it.each([
    ['missing', undefined, /preço promocional/i],
    ['negative', -1, /número inteiro/i],
    ['fractional', 9000.5, /número inteiro/i],
    ['equal to the original', 12000, /preço promocional.*menor que o preço original/i],
    ['greater than the original', 12001, /preço promocional.*menor que o preço original/i],
  ])(
    'rejects an active product promotion with a %s price',
    (_label, promotionalPriceCents, message) => {
      expect(() =>
        validateProductInput({
          ...validProduct,
          promotionActive: true,
          ...(promotionalPriceCents !== undefined ? { promotionalPriceCents } : {}),
        }),
      ).toThrow(message);
    },
  );

  it('validates active promotions against each variant original price', () => {
    const customizationAttributes = [
      {
        id: 'color',
        label: 'Cor',
        options: [
          { id: 'blue', label: 'Azul' },
          { id: 'red', label: 'Vermelho' },
        ],
        defaultOptionId: 'blue',
      },
    ];
    const variantPrices = [
      {
        selections: [{ attributeId: 'color', optionId: 'blue' }],
        priceCents: 15000,
        promotionalPriceCents: 12000,
      },
      {
        selections: [{ attributeId: 'color', optionId: 'red' }],
        priceCents: 11000,
        promotionalPriceCents: 8000,
      },
    ];

    expect(
      validateProductInput({
        ...validProduct,
        promotionActive: true,
        customizationAttributes,
        variantPrices,
      }).variantPrices,
    ).toEqual(variantPrices);
    expect(() =>
      validateProductInput({
        ...validProduct,
        promotionActive: true,
        customizationAttributes,
        variantPrices: variantPrices.map((variant, index) =>
          index === 1 ? { ...variant, promotionalPriceCents: 11000 } : variant,
        ),
      }),
    ).toThrow(/preço promocional menor que o preço original para cada combinação/i);
    expect(() =>
      validateProductInput({
        ...validProduct,
        promotionActive: true,
        customizationAttributes,
        variantPrices: variantPrices.map((variant, index) =>
          index === 1
            ? { selections: variant.selections, priceCents: variant.priceCents }
            : variant,
        ),
      }),
    ).toThrow(/preço promocional menor que o preço original para cada combinação/i);
  });

  it('keeps legacy products valid when promotion fields are absent', () => {
    expect(validateProductInput(validProduct)).not.toHaveProperty('promotionActive');
    expect(validateProductInput(validProduct)).not.toHaveProperty('promotionalPriceCents');
  });

  it('accepts a positive whole-day estimate for a simple product', () => {
    expect(
      validateProductInput({
        ...validProduct,
        estimatedDeliveryEnabled: true,
        estimatedDeliveryDays: 1,
      }),
    ).toMatchObject({
      estimatedDeliveryEnabled: true,
      estimatedDeliveryDays: 1,
    });
  });

  it.each([
    ['missing', undefined, /prazo estimado/i],
    ['zero', 0, /número inteiro entre 1/i],
    ['negative', -1, /número inteiro entre 1/i],
    ['fractional', 1.5, /número inteiro entre 1/i],
    ['unsafe integer', Number.MAX_SAFE_INTEGER + 1, /número inteiro entre 1/i],
  ])('rejects a %s simple-product estimate when enabled', (_label, estimatedDeliveryDays, message) => {
    expect(() =>
      validateProductInput({
        ...validProduct,
        estimatedDeliveryEnabled: true,
        ...(estimatedDeliveryDays !== undefined ? { estimatedDeliveryDays } : {}),
      }),
    ).toThrow(message);
  });

  it('requires a valid estimate for every customization combination', () => {
    const customizationAttributes = [
      {
        id: 'color',
        label: 'Cor',
        options: [
          { id: 'blue', label: 'Azul' },
          { id: 'red', label: 'Vermelho' },
        ],
        defaultOptionId: 'blue',
      },
    ];
    const variantPrices = [
      {
        selections: [{ attributeId: 'color', optionId: 'blue' }],
        priceCents: 12000,
        estimatedDeliveryDays: 7,
      },
      {
        selections: [{ attributeId: 'color', optionId: 'red' }],
        priceCents: 13000,
        estimatedDeliveryDays: 15,
      },
    ];

    expect(
      validateProductInput({
        ...validProduct,
        estimatedDeliveryEnabled: true,
        customizationAttributes,
        variantPrices,
      }).variantPrices,
    ).toEqual(variantPrices);
    expect(() =>
      validateProductInput({
        ...validProduct,
        estimatedDeliveryEnabled: true,
        customizationAttributes,
        variantPrices: variantPrices.map(({ estimatedDeliveryDays, ...variant }, index) =>
          index === 1 ? variant : { ...variant, estimatedDeliveryDays },
        ),
      }),
    ).toThrow(/prazo estimado.*cada combinação/i);
    expect(() =>
      validateProductInput({
        ...validProduct,
        estimatedDeliveryEnabled: true,
        customizationAttributes,
        variantPrices: variantPrices.map((variant, index) =>
          index === 1 ? { ...variant, estimatedDeliveryDays: 0 } : variant,
        ),
      }),
    ).toThrow(/prazo estimado da combinação.*número inteiro entre 1/i);
  });

  it('keeps legacy products valid when estimated-delivery fields are absent', () => {
    expect(validateProductInput(validProduct)).not.toHaveProperty('estimatedDeliveryEnabled');
    expect(validateProductInput(validProduct)).not.toHaveProperty('estimatedDeliveryDays');
  });
});

const emulatorOnly = describeVitest.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
const testTenantId = 'product-gallery-test-tenant';
const testProductId = `product-gallery-test-${randomUUID()}`;
const galleryImages = [
  {
    id: 'gallery-image-1',
    storagePath: `product-images/${testTenantId}/${testProductId}/image-1.jpg`,
    downloadUrl: 'https://images.example.test/gallery-1.jpg',
  },
];
const attributes = [
  {
    id: 'color',
    label: 'Cor',
    options: [
      { id: 'standard', label: 'Padrão' },
      { id: 'brown', label: 'Castanho' },
    ],
    defaultOptionId: 'standard',
  },
  {
    id: 'fabric',
    label: 'Tecido',
    options: [
      { id: 'linen', label: 'Linho' },
      { id: 'suede', label: 'Suede' },
    ],
    defaultOptionId: 'linen',
  },
];
const validProductInput = {
  id: testProductId,
  name: 'Produto com galeria',
  description: 'Descrição mantida pelo backoffice.',
  imageUrl: 'https://images.example.test/old.jpg',
  defaultImages: galleryImages,
  customizationAttributes: attributes,
  priceCents: 12000,
  durationMinutes: 60,
  commissionType: 'percentage',
  commissionValue: 3500,
  active: true,
  variantPrices: [
    {
      selections: [
        { attributeId: 'color', optionId: 'standard' },
        { attributeId: 'fabric', optionId: 'linen' },
      ],
      priceCents: 10000,
    },
    {
      selections: [
        { attributeId: 'color', optionId: 'standard' },
        { attributeId: 'fabric', optionId: 'suede' },
      ],
      priceCents: 11000,
    },
    {
      selections: [
        { attributeId: 'color', optionId: 'brown' },
        { attributeId: 'fabric', optionId: 'linen' },
      ],
      priceCents: 12000,
    },
    {
      selections: [
        { attributeId: 'color', optionId: 'brown' },
        { attributeId: 'fabric', optionId: 'suede' },
      ],
      priceCents: 13000,
    },
  ],
};
const selections = [
  { attributeId: 'color', optionId: 'brown' },
  { attributeId: 'fabric', optionId: 'linen' },
];

emulatorOnly('product gallery administration on Firestore emulator', () => {
  beforeEach(async () => {
    const galleryKey = JSON.stringify([
      ['color', 'brown'],
      ['fabric', 'linen'],
    ]);
    const galleryId = productGalleryDocumentId(testProductId, galleryKey);
    await Promise.all([
      firestore.collection(collections.products).doc(testProductId).delete(),
      firestore.collection(collections.publicProducts).doc(testProductId).delete(),
      firestore.collection(collections.productImageGalleries).doc(galleryId).delete(),
      firestore.collection(collections.publicProductGalleries).doc(galleryId).delete(),
    ]);
    await firestore.collection(collections.tenants).doc(testTenantId).set({
      name: 'Empresa isolada de teste',
      slug: 'product-gallery-test',
      segment: 'beauty',
      timezone: 'America/Sao_Paulo',
      bookingIntervalMinutes: 15,
      active: true,
    });
    await firestore.collection(collections.publicBusinesses).doc(testTenantId).set({
      tenantId: testTenantId,
      name: 'Empresa isolada de teste',
      slug: 'product-gallery-test',
      segment: 'beauty',
      published: true,
    });
    await firestore.collection(collections.products).doc(testProductId).set({
      tenantId: testTenantId,
      name: 'Produto anterior',
      imageUrl: 'https://images.example.test/old.jpg',
    });
    await saveProduct(testTenantId, validProductInput);
  });

  afterAll(async () => {
    const productId = testProductId;
    const key = JSON.stringify([
      ['color', 'brown'],
      ['fabric', 'linen'],
    ]);
    const galleryId = productGalleryDocumentId(productId, key);
    const batch = firestore.batch();
    [
      [collections.tenants, testTenantId],
      [collections.publicBusinesses, testTenantId],
      [collections.products, testProductId],
      [collections.publicProducts, testProductId],
      [collections.productImageGalleries, galleryId],
      [collections.publicProductGalleries, galleryId],
    ].forEach(([collection, id]) => {
      batch.delete(firestore.collection(collection!).doc(id!));
    });
    await batch.commit();
  });

  itVitest(
    'persists optional attributes and default images in the safe public projection',
    async () => {
      const product = (
        await firestore.collection(collections.products).doc(testProductId).get()
      ).data();
      const projection = (
        await firestore.collection(collections.publicProducts).doc(testProductId).get()
      ).data();
      expect(product).toMatchObject({
        customizationAttributes: attributes,
        defaultImages: galleryImages,
        imageUrl: galleryImages[0]!.downloadUrl,
        description: 'Descrição mantida pelo backoffice.',
        variantPrices: validProductInput.variantPrices,
      });
      expect(projection).toMatchObject({
        customizationAttributes: attributes,
        defaultImages: galleryImages,
        imageUrl: galleryImages[0]!.downloadUrl,
      });
      expect(projection).not.toHaveProperty('commissionValue');
      expect(projection).toHaveProperty('variantPrices', validProductInput.variantPrices);
    },
  );

  itVitest(
    'saves active promotions for the owning tenant and clears inactive public prices',
    async () => {
      const variantPrices = validProductInput.variantPrices.map((variant) => ({
        ...variant,
        promotionalPriceCents: variant.priceCents - 1000,
      }));
      await saveProduct(testTenantId, {
        ...validProductInput,
        promotionActive: true,
        variantPrices,
      });

      const internalProduct = (
        await firestore.collection(collections.products).doc(testProductId).get()
      ).data();
      const publicProduct = (
        await firestore.collection(collections.publicProducts).doc(testProductId).get()
      ).data();
      expect(internalProduct).toMatchObject({ promotionActive: true, variantPrices });
      expect(publicProduct).toMatchObject({ promotionActive: true, variantPrices });

      const activeCatalog = await getPublicCatalog.run({
        data: { businessSlug: 'product-gallery-test' },
        rawRequest: {},
        acceptsStreaming: false,
      } as never);
      const activeCatalogProduct = activeCatalog.products.find(
        (product) => product.id === testProductId,
      );
      expect(activeCatalogProduct).toMatchObject({ promotionActive: true });
      expect(activeCatalogProduct?.variantPrices?.[0]).toMatchObject({
        promotionalPriceCents: 9000,
      });

      await expect(
        saveProduct('another-tenant', {
          ...validProductInput,
          promotionActive: true,
          variantPrices,
        }),
      ).rejects.toMatchObject({ code: 'not-found' });
      expect(
        (await firestore.collection(collections.products).doc(testProductId).get()).data(),
      ).toMatchObject({ tenantId: testTenantId, promotionActive: true });

      await saveProduct(testTenantId, {
        ...validProductInput,
        promotionActive: false,
        variantPrices,
      });
      const inactiveProjection = (
        await firestore.collection(collections.publicProducts).doc(testProductId).get()
      ).data();
      expect(inactiveProjection).toHaveProperty('promotionActive', false);
      expect(inactiveProjection?.variantPrices?.[0]).not.toHaveProperty('promotionalPriceCents');

      const publicCatalog = await getPublicCatalog.run({
        data: { businessSlug: 'product-gallery-test' },
        rawRequest: {},
        acceptsStreaming: false,
      } as never);
      const catalogProduct = publicCatalog.products.find((product) => product.id === testProductId);
      expect(catalogProduct).toMatchObject({ promotionActive: false });
      expect(catalogProduct).not.toHaveProperty('promotionalPriceCents');
      expect(catalogProduct?.variantPrices?.[0]).not.toHaveProperty('promotionalPriceCents');
    },
  );

  itVitest(
    'persists valid estimates, projects the business timezone, and rejects another tenant',
    async () => {
      const variantPrices = validProductInput.variantPrices.map((variant, index) => ({
        ...variant,
        estimatedDeliveryDays: index + 1,
      }));
      await saveProduct(testTenantId, {
        ...validProductInput,
        estimatedDeliveryEnabled: true,
        variantPrices,
      });

      const internalProduct = (
        await firestore.collection(collections.products).doc(testProductId).get()
      ).data();
      const publicProduct = (
        await firestore.collection(collections.publicProducts).doc(testProductId).get()
      ).data();
      const publicBusiness = (
        await firestore.collection(collections.publicBusinesses).doc(testTenantId).get()
      ).data();
      expect(internalProduct).toMatchObject({
        estimatedDeliveryEnabled: true,
        variantPrices,
      });
      expect(publicProduct).toMatchObject({
        estimatedDeliveryEnabled: true,
        variantPrices,
      });
      expect(publicBusiness).toMatchObject({ timezone: 'America/Sao_Paulo' });

      const catalog = await getPublicCatalog.run({
        data: { businessSlug: 'product-gallery-test' },
        rawRequest: {},
        acceptsStreaming: false,
      } as never);
      expect(catalog.business).toMatchObject({ timezone: 'America/Sao_Paulo' });
      expect(
        catalog.products.find((product) => product.id === testProductId)?.variantPrices,
      ).toEqual(variantPrices);

      await expect(
        saveProduct('another-tenant', {
          ...validProductInput,
          estimatedDeliveryEnabled: true,
          variantPrices,
        }),
      ).rejects.toMatchObject({ code: 'not-found' });
      expect(
        (await firestore.collection(collections.products).doc(testProductId).get()).data(),
      ).toMatchObject({ tenantId: testTenantId, estimatedDeliveryEnabled: true });

      await saveProduct(testTenantId, {
        ...validProductInput,
        estimatedDeliveryEnabled: false,
        variantPrices,
      });
      const disabledProjection = (
        await firestore.collection(collections.publicProducts).doc(testProductId).get()
      ).data();
      expect(disabledProjection).toHaveProperty('estimatedDeliveryEnabled', false);
      expect(disabledProjection?.variantPrices?.[0]).not.toHaveProperty('estimatedDeliveryDays');
    },
  );

  itVitest('clears variant prices when switched back to a fixed product price', async () => {
    await saveProduct(testTenantId, { ...validProductInput, variantPrices: null });
    const product = (
      await firestore.collection(collections.products).doc(testProductId).get()
    ).data();
    expect(product).toHaveProperty('variantPrices', null);
  });

  itVitest(
    'validates complete option combinations, tenant ownership, and one-to-ten image references',
    async () => {
      await expect(
        saveProductGallery(testTenantId, {
          productId: testProductId,
          selections: [{ attributeId: 'color', optionId: 'brown' }],
          images: galleryImages,
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      await expect(
        saveProductGallery('another-tenant', {
          productId: testProductId,
          selections,
          images: galleryImages,
        }),
      ).rejects.toMatchObject({ code: 'not-found' });
      await expect(
        saveProductGallery(testTenantId, {
          productId: testProductId,
          selections,
          images: [],
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      await expect(
        saveProductGallery(testTenantId, {
          productId: testProductId,
          selections: [...selections, { attributeId: 'color', optionId: 'standard' }],
          images: galleryImages,
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      await expect(
        saveProductGallery(testTenantId, {
          productId: testProductId,
          selections,
          images: [
            {
              ...galleryImages[0],
              storagePath: `product-images/another-tenant/${testProductId}/image.jpg`,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    },
  );

  itVitest(
    'upserts one exact gallery, returns paths for cleanup, and removes its public projection',
    async () => {
      const first = await saveProductGallery(testTenantId, {
        productId: testProductId,
        selections,
        images: galleryImages,
      });
      const second = await saveProductGallery(testTenantId, {
        productId: testProductId,
        selections,
        images: galleryImages,
      });
      expect(second).toEqual(first);
      const business = await findPublicBusiness('product-gallery-test');
      const id = productGalleryDocumentId(testProductId, first.combinationKey);
      expect(
        (await firestore.collection(collections.publicProductGalleries).doc(id).get()).data(),
      ).toMatchObject({ id, productId: testProductId, selections, images: galleryImages });
      expect(
        (
          await firestore
            .collection(collections.productImageGalleries)
            .where('tenantId', '==', testTenantId)
            .get()
        ).docs,
      ).toHaveLength(1);
      expect(business.tenantId).toBe(testTenantId);
      await expect(
        deleteProductGallery(testTenantId, { productId: testProductId, galleryId: id }),
      ).resolves.toEqual({ deleted: true, storagePaths: [galleryImages[0]!.storagePath] });
      expect(
        (await firestore.collection(collections.publicProductGalleries).doc(id).get()).exists,
      ).toBe(false);
    },
  );
});
