import type { JSX } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { BrowserRouter, StaticRouter } from 'react-router-dom';
import type { PageComponents } from '../interfaces/page.interface';
import Layout from './Layout';
import StorefrontNavigation from './StorefrontNavigation';
export { createPageElement } from './page-renderer';

type StorefrontAppProps = {
  pathname: string;
  queryClient: QueryClient;
  page: JSX.Element;
  routerMode: 'static' | 'browser';
  loadPageComponents: (name: string) => Promise<Partial<PageComponents>>;
};

export default function StorefrontApp({
  queryClient,
  routerMode,
  pathname,
  page,
  loadPageComponents,
}: Readonly<StorefrontAppProps>): JSX.Element {
  const app: JSX.Element = (
    <QueryClientProvider client={queryClient}>
      <Layout>
        {routerMode === 'static' ? (
          page
        ) : (
          <StorefrontNavigation
            initialPathname={pathname}
            initialPage={page}
            loadPageComponents={loadPageComponents}
          />
        )}
      </Layout>
    </QueryClientProvider>
  );

  if (routerMode === 'static') {
    return <StaticRouter location={pathname}>{app}</StaticRouter>;
  }

  return <BrowserRouter>{app}</BrowserRouter>;
}
