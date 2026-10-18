import type { BusinessSegment } from '../../../shared/domain/interfaces/tenant.interface.js';
import type {
  ProductCustomizationAttribute,
  ProductImage,
  ProductImageGallery,
  ProductVariantPrice,
} from '@shared/interfaces/product.interface';

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  segment: BusinessSegment;
  description?: string;
  logoUrl?: string;
}

export interface CompanyCatalog {
  business: CompanySummary;
  products: PublicProductSummary[];
}

export interface PublicProductSummary {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  customizationAttributes?: ProductCustomizationAttribute[];
  variantPrices?: ProductVariantPrice[] | null;
  defaultImages?: ProductImage[];
  imageGalleries?: ProductImageGallery[];
  priceCents: number;
  durationMinutes: number;
}
