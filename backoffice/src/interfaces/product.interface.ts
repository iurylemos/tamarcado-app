import type {
  CommissionType,
  ProductComboItem,
  ProductCustomizationAttribute,
  ProductImage,
  ProductImageGallery,
  ProductVariantPrice,
} from '@shared/interfaces/product.interface';

export type ProductInputData = {
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  promotionActive?: boolean;
  promotionalPriceCents?: number;
  estimatedDeliveryEnabled?: boolean;
  estimatedDeliveryDays?: number;
  variantPrices: ProductVariantPrice[] | null;
  durationMinutes: number;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  active: boolean;
  customizationAttributes: ProductCustomizationAttribute[];
  comboItems?: ProductComboItem[];
  defaultImages: ProductImage[];
  id: string;
};

export interface ProductRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  imageUrl: string;
  customizationAttributes?: ProductCustomizationAttribute[];
  comboItems?: ProductComboItem[];
  variantPrices?: ProductVariantPrice[] | null;
  defaultImages?: ProductImage[];
  imageGalleries?: ProductImageGallery[];
  priceCents: number;
  promotionActive?: boolean;
  promotionalPriceCents?: number;
  estimatedDeliveryEnabled?: boolean;
  estimatedDeliveryDays?: number;
  durationMinutes: number;
  commissionType: CommissionType;
  commissionValue: number;
  active: boolean;
}
