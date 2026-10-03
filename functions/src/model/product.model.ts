import type { CommissionType } from '../../../shared/domain/interfaces/product.interface';

export interface ProductDocument {
  tenantId: string;
  name: string;
  description?: string;
  imageUrl: string;
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
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  published: boolean;
}
