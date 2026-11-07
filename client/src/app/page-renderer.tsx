import type { JSX } from 'react';
import type { PageData } from './page-data';
import type { PageComponents } from '../interfaces/page.interface';

export function createPageElement(
  page: PageData,
  components: Partial<PageComponents>,
): JSX.Element {
  if (page.name === 'home' && components.home) return <components.home />;

  if (page.name === 'catalog' && components.catalog) {
    return (
      <components.catalog
        slug={page.slug}
        {...(page.business !== undefined ? { initialBusiness: page.business } : {})}
        {...(page.status ? { status: page.status } : {})}
      />
    );
  }

  if (page.name === 'booking' && components.booking) {
    return (
      <components.booking
        slug={page.slug}
        productId={page.productId}
        initialBusiness={page.business}
        initialProduct={page.product}
        {...(page.status ? { initialStatus: page.status } : {})}
      />
    );
  }

  if (page.name === 'not-found' && components.notFound) return <components.notFound />;

  throw new Error(`Missing page component for route "${page.name}".`);
}
