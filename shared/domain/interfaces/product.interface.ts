export interface PublicProduct {
  id: string;
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

export type CommissionType = 'percentage' | 'fixed';

export interface Product extends PublicProduct {
  commissionType: CommissionType;
  commissionValue: number;
}
