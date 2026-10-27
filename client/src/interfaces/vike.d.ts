import type { CompanyCatalog } from './company.interface';
import type { PublicCatalogStatus } from './catalog.interface';

declare global {
  namespace Vike {
    interface PageContextServer {
      initialCatalog?: CompanyCatalog | null;
      initialCatalogStatus?: PublicCatalogStatus;
    }
  }
}
