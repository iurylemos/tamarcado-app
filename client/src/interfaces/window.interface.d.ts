import type { CompanyCatalog } from './company.interface';

declare global {
  interface Window {
    __TAMARCADO_SSR__?: { catalog: CompanyCatalog };
  }
}

export {};
