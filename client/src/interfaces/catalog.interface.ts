import type { CompanySummary, PublicProductSummary } from './company.interface';

export type PublicCatalogStatus = 'ready' | 'not-found' | 'unavailable' | 'error';

export type PublicCatalogData = {
  slug: string;
  productId: string;
  business?: CompanySummary | null;
  product?: PublicProductSummary | null;
  status?: PublicCatalogStatus;
};

export type PublicScheduleData = Omit<PublicCatalogData, 'productId' | 'product'>;

export type CatalogCursor = { id: string; name: string };
