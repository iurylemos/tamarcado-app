import type { PublicCatalogStatus } from './catalog.interface';
import type { CompanySummary, PublicProductSummary } from './company.interface';

export type StorefrontService = {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  priceCents: number;
  durationMinutes: number;
};

export type StoreFrontPageData =
  | { name: 'home' | 'not-found' }
  | {
      name: 'catalog';
      slug: string;
      business?: CompanySummary | null;
      status?: PublicCatalogStatus;
    }
  | {
      name: 'booking';
      slug: string;
      productId: string;
      business?: CompanySummary | null;
      product?: PublicProductSummary | null;
      status?: PublicCatalogStatus;
    };

export type StoreFrontPageMeta = {
  title: string;
  description: string;
  canonicalUrl?: string;
  imageUrl?: string;
};
