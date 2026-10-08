import type { BusinessSegment } from '../../../shared/domain/interfaces/tenant.interface.js';

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
  priceCents: number;
  durationMinutes: number;
}

export type BookingReceipt = {
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
};
