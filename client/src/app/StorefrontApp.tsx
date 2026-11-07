import type { JSX } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { BrowserRouter, StaticRouter } from 'react-router-dom';
import type { PageComponents } from '../interfaces/page.interface';
import Layout from './Layout';
import StorefrontNavigation from './StorefrontNavigation';
export { createPageElement } from './page-renderer';

type StorefrontAppBaseProps = {
  pathname: string;
  queryClient: QueryClient;
  page: JSX.Element;
};

type StorefrontAppProps =
  | (StorefrontAppBaseProps & { routerMode: 'static' })
  | (StorefrontAppBaseProps & {
      routerMode: 'browser';
      loadPageComponents: (name: string) => Promise<Partial<PageComponents>>;
    });

export default function StorefrontApp(props: Readonly<StorefrontAppProps>): JSX.Element {
  const app = (
    <QueryClientProvider client={props.queryClient}>
      <Layout>
        {props.routerMode === 'static' ? (
          props.page
        ) : (
          <StorefrontNavigation
            initialPathname={props.pathname}
            initialPage={props.page}
            loadPageComponents={props.loadPageComponents}
          />
        )}
      </Layout>
    </QueryClientProvider>
  );

  if (props.routerMode === 'static') {
    return <StaticRouter location={props.pathname}>{app}</StaticRouter>;
  }

  return (
    <BrowserRouter>{app}</BrowserRouter>
  );
}
