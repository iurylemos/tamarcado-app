import type { ComponentType } from 'react';
import type { PublicCatalogStatus } from './catalog.interface';
import type { CompanySummary, PublicProductSummary } from './company.interface';

export type PageComponents = {
  home: ComponentType;
  catalog: ComponentType<{ slug: string; status?: PublicCatalogStatus }>;
  booking: ComponentType<{
    slug: string;
    productId: string;
    initialBusiness?: CompanySummary | null;
    initialProduct?: PublicProductSummary | null;
    initialStatus?: PublicCatalogStatus;
  }>;
  notFound: ComponentType;
};
