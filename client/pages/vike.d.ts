import type { CompanyCatalog } from '../src/interfaces/company.interface';
import type { PublicCatalogStatus } from './types';

declare global {
  namespace Vike {
    interface PageContextServer {
      initialCatalog?: CompanyCatalog | null;
      initialCatalogStatus?: PublicCatalogStatus;
    }
  }
}

export {};
