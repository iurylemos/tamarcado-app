import { createHash } from 'node:crypto';
import type {
  ProductCustomizationSelection,
  ProductImage,
  ProductImageGallery,
} from '../../../shared/domain/interfaces/product.interface';

export interface ProductGalleryDocument extends ProductImageGallery {
  tenantId: string;
  businessSlug: string;
  published: boolean;
}

export type PublicProductGalleryDocument = ProductImageGallery & {
  tenantId: string;
  businessSlug: string;
  published: boolean;
};

export function productGalleryCombinationKey(
  selections: readonly ProductCustomizationSelection[],
): string {
  return JSON.stringify(
    [...selections]
      .sort((first, second) => first.attributeId.localeCompare(second.attributeId))
      .map(({ attributeId, optionId }) => [attributeId, optionId]),
  );
}

export function productGalleryDocumentId(productId: string, combinationKey: string): string {
  return createHash('sha256').update(`${productId}|${combinationKey}`).digest('hex');
}

export function defaultProductImages(product: {
  id?: string;
  imageUrl: string;
  defaultImages?: ProductImage[];
}): ProductImage[] {
  if (Array.isArray(product.defaultImages) && product.defaultImages.length > 0) {
    return product.defaultImages;
  }
  return [
    {
      id: 'legacy-image',
      storagePath: '',
      downloadUrl: product.imageUrl,
    },
  ];
}
