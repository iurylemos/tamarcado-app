import type {
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';

export type GalleryDraft = {
  id?: string;
  selections: ProductCustomizationSelection[];
  images: ProductImage[];
  files: File[];
};
