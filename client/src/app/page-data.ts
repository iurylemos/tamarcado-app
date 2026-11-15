import type { StorefrontInitialData } from '../interfaces/storefront-render.interface';
import type { AppRoute } from './routes';
import type { StoreFrontPageData } from '../interfaces/storeFront.interface';

export function resolvePageData(
  route: AppRoute,
  initial: StorefrontInitialData,
): StoreFrontPageData {
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
