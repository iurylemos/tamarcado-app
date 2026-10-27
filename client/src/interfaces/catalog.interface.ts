import type { CompanyCatalog } from './company.interface';

export type PublicCatalogStatus = 'ready' | 'not-found' | 'unavailable' | 'error';

export type PublicCatalogData = {
  slug: string;
  productId: string;
  catalog?: CompanyCatalog | null;
  status?: PublicCatalogStatus;
};

export type PublicScheduleData = Omit<PublicCatalogData, 'productId'>;
