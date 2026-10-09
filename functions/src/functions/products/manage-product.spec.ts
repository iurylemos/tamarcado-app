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
    expect(validateProductInput({ ...validProduct, customizationAttributes: [] }))
      .toMatchObject({ customizationAttributes: [] });
    expect(() =>
      validateProductInput({
        ...validProduct,
        customizationAttributes: [
          { id: 'color', label: 'Cor', options: [{ id: 'brown', label: 'Castanho' }], defaultOptionId: 'brown' },
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

    itVitest('persists optional attributes and default images in the safe public projection', async () => {
      const product = (await firestore.collection(collections.products).doc(testProductId).get()).data();
      const projection = (
        await firestore.collection(collections.publicProducts).doc(testProductId).get()
      ).data();
      expect(product).toMatchObject({
        customizationAttributes: attributes,
        defaultImages: galleryImages,
        imageUrl: galleryImages[0]!.downloadUrl,
        description: 'Descrição mantida pelo backoffice.',
      });
      expect(projection).toMatchObject({
        customizationAttributes: attributes,
        defaultImages: galleryImages,
        imageUrl: galleryImages[0]!.downloadUrl,
      });
      expect(projection).not.toHaveProperty('commissionValue');
    });

    itVitest('validates complete option combinations, tenant ownership, and one-to-ten image references', async () => {
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
    });

    itVitest('upserts one exact gallery, returns paths for cleanup, and removes its public projection', async () => {
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
        (await firestore.collection(collections.productImageGalleries).where('tenantId', '==', testTenantId).get())
          .docs,
      ).toHaveLength(1);
      expect(business.tenantId).toBe(testTenantId);
      await expect(
        deleteProductGallery(testTenantId, { productId: testProductId, galleryId: id }),
      ).resolves.toEqual({ deleted: true, storagePaths: [galleryImages[0]!.storagePath] });
      expect((await firestore.collection(collections.publicProductGalleries).doc(id).get()).exists).toBe(
        false,
      );
    });
  });
