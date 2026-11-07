import type { ComponentType } from 'react';
import type { PublicCatalogStatus } from './catalog.interface';
import type { CompanySummary, PublicProductSummary } from './company.interface';

type CatalogPageComponent = {
  slug: string;
  initialBusiness?: CompanySummary | null;
  status?: PublicCatalogStatus;
};

type BookingPageComponent = {
  slug: string;
  productId: string;
  initialBusiness?: CompanySummary | null;
  initialProduct?: PublicProductSummary | null;
  initialStatus?: PublicCatalogStatus;
};

export type PageComponents = {
  home: ComponentType;
  catalog: ComponentType<CatalogPageComponent>;
  booking: ComponentType<BookingPageComponent>;
  notFound: ComponentType;
};
