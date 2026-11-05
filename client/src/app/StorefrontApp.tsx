import type { JSX } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { PageData } from './page-data';
import type { PageComponents } from '../interfaces/page.interface';
import Layout from './Layout';

export function createPageElement(
  page: PageData,
  components: Partial<PageComponents>,
): JSX.Element {
  if (page.name === 'home' && components.home) return <components.home />;

  if (page.name === 'catalog' && components.catalog) {
    return (
      <components.catalog slug={page.slug} {...(page.status ? { status: page.status } : {})} />
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

type StorefrontAppProps = {
  pathname: string;
  queryClient: QueryClient;
  page: JSX.Element;
};

export default function StorefrontApp({
  pathname,
  queryClient,
  page,
}: Readonly<StorefrontAppProps>): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout pathname={pathname}>{page}</Layout>
    </QueryClientProvider>
  );
}
