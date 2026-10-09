import type { CommissionType } from '../../../shared/domain/interfaces/product.interface';
import type {
  ProductCustomizationAttribute,
  ProductImageGallery,
  ProductImage,
} from '../../../shared/domain/interfaces/product.interface';

export interface ProductDocument {
  tenantId: string;
  name: string;
  description?: string;
  imageUrl: string;
  customizationAttributes?: ProductCustomizationAttribute[];
  defaultImages?: ProductImage[];
  imageGalleries?: ProductImageGallery[];
  priceCents: number;
  durationMinutes: number;
  commissionType: CommissionType;
  commissionValue: number;
  active: boolean;
}

export interface PublicProductDocument {
  tenantId: string;
  businessSlug: string;
  name: string;
  description?: string;
  imageUrl: string;
  customizationAttributes?: ProductCustomizationAttribute[];
  defaultImages?: ProductImage[];
  imageGalleries?: ProductImageGallery[];
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  published: boolean;
}
