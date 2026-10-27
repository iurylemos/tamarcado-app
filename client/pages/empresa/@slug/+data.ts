import type { PageContextServer } from 'vike/types';
import type { PublicScheduleData } from '../../../src/interfaces/catalog.interface';

export function data(pageContext: Readonly<PageContextServer>): PublicScheduleData {
  const {
    routeParams: { slug },
    initialCatalog,
    initialCatalogStatus,
  } = pageContext;

  if (!initialCatalog && !initialCatalogStatus) {
    return { slug };
  }

  const catalog = initialCatalog?.business.slug === slug ? initialCatalog : null;

  const status = catalog !== null ? 'ready' : (initialCatalogStatus ?? 'not-found');

  return { slug, catalog, status };
}
