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
  primaryColor?: string;
  secondaryColor?: string;
  timezone?: string;
}

export interface CompanyCatalog {
  business: CompanySummary;
  products: PublicProductSummary[];
  promotions?: PublicProductSummary[];
  hasMore?: boolean;
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
  promotionActive?: boolean;
  promotionalPriceCents?: number;
  estimatedDeliveryEnabled?: boolean;
  estimatedDeliveryDays?: number;
  durationMinutes: number;
}
