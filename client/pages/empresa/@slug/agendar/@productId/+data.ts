import type { PageContextServer } from 'vike/types';
import type { PublicCatalogData } from '../../../../../src/interfaces/catalog.interface';

export function data(pageContext: Readonly<PageContextServer>): PublicCatalogData {
  const { slug, productId } = pageContext.routeParams;
  const { initialBusiness, initialProduct, initialCatalogStatus } = pageContext;

  if (initialBusiness === undefined && initialCatalogStatus === undefined) {
    return { slug, productId };
  }

  const business = initialBusiness?.slug === slug ? initialBusiness : null;
  const product = business && initialProduct?.id === productId ? initialProduct : null;
  const status = product
    ? 'ready'
    : initialCatalogStatus && initialCatalogStatus !== 'ready'
      ? initialCatalogStatus
      : 'not-found';

  return { slug, productId, business, product, status };
}
