export interface ProductCustomizationOption {
  id: string;
  label: string;
}

export interface ProductCustomizationAttribute {
  id: string;
  label: string;
  options: ProductCustomizationOption[];
  defaultOptionId: string;
}

export interface ProductImage {
  id: string;
  storagePath: string;
  downloadUrl: string;
}

export interface ProductCustomizationSelection {
  attributeId: string;
  optionId: string;
}

export interface ProductVariantPrice {
  selections: ProductCustomizationSelection[];
  priceCents: number;
}

export interface ProductCustomizationSnapshot extends ProductCustomizationSelection {
  attributeLabel: string;
  optionLabel: string;
}

export interface ProductImageGallery {
  id: string;
  productId: string;
  combinationKey: string;
  selections: ProductCustomizationSelection[];
  images: ProductImage[];
}

export interface PublicProduct {
  id: string;
  tenantId: string;
  businessSlug: string;
  name: string;
  description?: string;
  imageUrl: string;
  customizationAttributes?: ProductCustomizationAttribute[];
  variantPrices?: ProductVariantPrice[] | null;
  defaultImages?: ProductImage[];
  imageGalleries?: ProductImageGallery[];
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  published: boolean;
}

export type CommissionType = 'percentage' | 'fixed';

export interface Product extends PublicProduct {
  commissionType: CommissionType;
  commissionValue: number;
}
