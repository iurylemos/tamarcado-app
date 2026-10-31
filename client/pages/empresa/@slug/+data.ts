import type { PageContextServer } from 'vike/types';
import type { PublicScheduleData } from '../../../src/interfaces/catalog.interface';

export function data(pageContext: Readonly<PageContextServer>): PublicScheduleData {
  const {
    routeParams: { slug },
    initialBusiness,
    initialCatalogStatus,
  } = pageContext;

  if (!initialBusiness && !initialCatalogStatus) {
    return { slug };
  }

  const business = initialBusiness?.slug === slug ? initialBusiness : null;

  const status = business !== null ? 'ready' : (initialCatalogStatus ?? 'not-found');

  return { slug, business, status };
}
