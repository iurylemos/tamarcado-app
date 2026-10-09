import type {
  ProductCustomizationAttribute,
  ProductImage,
  ProductCustomizationSelection,
} from '../../../shared/domain/interfaces/product.interface';
import {
  productGalleryCombinationKey,
  productGalleryDocumentId,
} from '../../src/model/product-gallery.model';

export const customizationTestProductId = 'customization-test-product';
export const customizationTestTenantId = 'tenant-aurora';
export const customizationTestImages: ProductImage[] = [
  {
    id: 'default-image-1',
    storagePath: 'product-images/tenant-aurora/customization-test-product/default-1.jpg',
    downloadUrl: 'https://images.example.test/default-1.jpg',
  },
  {
    id: 'default-image-2',
    storagePath: 'product-images/tenant-aurora/customization-test-product/default-2.jpg',
    downloadUrl: 'https://images.example.test/default-2.jpg',
  },
];

export const customizationTestAttributes: ProductCustomizationAttribute[] = [
  {
    id: 'color',
    label: 'Cor',
    options: [
      { id: 'color-standard', label: 'Padrão' },
      { id: 'color-brown', label: 'Castanho' },
    ],
    defaultOptionId: 'color-standard',
  },
  {
    id: 'size',
    label: 'Tamanho',
    options: [
      { id: 'size-couple', label: 'Casal' },
      { id: 'size-king', label: 'King' },
    ],
    defaultOptionId: 'size-couple',
  },
];

export const customizationTestSelections: ProductCustomizationSelection[] = [
  { attributeId: 'color', optionId: 'color-brown' },
  { attributeId: 'size', optionId: 'size-couple' },
];

const variantImages: ProductImage[] = [
  {
    id: 'variant-image-1',
    storagePath: 'product-images/tenant-aurora/customization-test-product/variant-1.jpg',
    downloadUrl: 'https://images.example.test/variant-1.jpg',
  },
  {
    id: 'variant-image-2',
    storagePath: 'product-images/tenant-aurora/customization-test-product/variant-2.jpg',
    downloadUrl: 'https://images.example.test/variant-2.jpg',
  },
];

const combinationKey = productGalleryCombinationKey(customizationTestSelections);
const galleryId = productGalleryDocumentId(customizationTestProductId, combinationKey);

export function createProductCustomizationTestDocuments() {
  const product = {
    tenantId: customizationTestTenantId,
    name: 'Serviço com personalização de teste',
    description: 'Fixture isolada de teste.',
    imageUrl: customizationTestImages[0]!.downloadUrl,
    customizationAttributes: customizationTestAttributes,
    defaultImages: customizationTestImages,
    priceCents: 12000,
    durationMinutes: 60,
    commissionType: 'percentage',
    commissionValue: 3500,
    active: true,
  };
  const gallery = {
    id: galleryId,
    tenantId: customizationTestTenantId,
    businessSlug: 'studio-aurora',
    productId: customizationTestProductId,
    combinationKey,
    selections: customizationTestSelections,
    images: variantImages,
    published: true,
  };
  return [
    { collection: 'products', id: customizationTestProductId, data: product },
    {
      collection: 'public_products',
      id: customizationTestProductId,
      data: {
        tenantId: customizationTestTenantId,
        businessSlug: 'studio-aurora',
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        customizationAttributes: product.customizationAttributes,
        defaultImages: product.defaultImages,
        priceCents: product.priceCents,
        durationMinutes: product.durationMinutes,
        active: true,
        published: true,
      },
    },
    {
      collection: 'professional_products',
      id: 'tenant-aurora__professional-ana__customization-test-product',
      data: {
        tenantId: customizationTestTenantId,
        professionalId: 'professional-ana',
        productId: customizationTestProductId,
        active: true,
      },
    },
    { collection: 'product_image_galleries', id: galleryId, data: gallery },
    {
      collection: 'public_product_galleries',
      id: galleryId,
      data: {
        id: galleryId,
        tenantId: customizationTestTenantId,
        businessSlug: 'studio-aurora',
        productId: customizationTestProductId,
        combinationKey,
        selections: customizationTestSelections,
        images: variantImages,
        published: true,
      },
    },
  ];
}
