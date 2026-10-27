import type { PageContextServer } from 'vike/types';
import type { PublicCatalogData } from '../../../../../src/interfaces/catalog.interface';

export function data(pageContext: Readonly<PageContextServer>): PublicCatalogData {
  const { slug, productId } = pageContext.routeParams;

  if (pageContext.initialCatalog === undefined && pageContext.initialCatalogStatus === undefined) {
    return { slug, productId };
  }

  const catalog =
    pageContext.initialCatalog?.business.slug === slug ? pageContext.initialCatalog : null;
  const status = catalog !== null ? 'ready' : (pageContext.initialCatalogStatus ?? 'not-found');

  return { slug, productId, catalog, status };
}
