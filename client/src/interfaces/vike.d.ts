import type { CompanySummary, PublicProductSummary } from './company.interface';
import type { PublicCatalogStatus } from './catalog.interface';

declare global {
  namespace Vike {
    interface PageContextServer {
      initialBusiness?: CompanySummary | null;
      initialProduct?: PublicProductSummary | null;
      initialCatalogStatus?: PublicCatalogStatus;
    }
    interface PageContext {
      abortReason?: string | { notAdmin: true };
    }
  }
}
