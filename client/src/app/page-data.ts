import type { CompanySummary, PublicProductSummary } from '../interfaces/company.interface';
import type { PublicCatalogStatus } from '../interfaces/catalog.interface';
import type { StorefrontInitialData } from '../interfaces/storefront-render.interface';
import type { AppRoute } from './routes';

export type PageData =
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

export function resolvePageData(route: AppRoute, initial: StorefrontInitialData): PageData {
  const { initialBusiness, initialProduct, initialCatalogStatus } = initial;
  const hasInitialData = initialBusiness !== undefined || initialCatalogStatus !== undefined;

  if (route.name === 'catalog') {
    const { slug } = route;
    if (!hasInitialData) return { name: 'catalog', slug };

    const business = initialBusiness?.slug === slug ? initialBusiness : null;
    const status = business !== null ? 'ready' : (initialCatalogStatus ?? 'not-found');

    return { name: 'catalog', slug, business, status };
  }

  if (route.name === 'booking') {
    const { slug, productId } = route;
    if (!hasInitialData) return { name: 'booking', slug, productId };

    const business = initialBusiness?.slug === slug ? initialBusiness : null;
    const product = business && initialProduct?.id === productId ? initialProduct : null;
    const status = product
      ? 'ready'
      : initialCatalogStatus && initialCatalogStatus !== 'ready'
        ? initialCatalogStatus
        : 'not-found';

    return { name: 'booking', slug, productId, business, product, status };
  }

  return { name: route.name };
}
