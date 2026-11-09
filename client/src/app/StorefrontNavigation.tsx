import { useEffect, useState, useCallback, type JSX } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { CompanyCatalog, CompanySummary } from '../interfaces/company.interface';
import { ReactQueryConfig } from '../config/react-query.config';
import type { PageComponents } from '../interfaces/page.interface';
import { resolvePageData } from './page-data';
import { matchRoute } from './routes';
import { createPageElement } from './page-renderer';
import FallbackLoading from '../components/atoms/FallbackLoading';

type ActivePage = {
  pathname: string;
  element: JSX.Element;
};

type StorefrontNavigationProps = {
  initialPathname: string;
  initialPage: JSX.Element;
  loadPageComponents: (name: string) => Promise<Partial<PageComponents>>;
};

export default function StorefrontNavigation({
  initialPathname,
  initialPage,
  loadPageComponents,
}: Readonly<StorefrontNavigationProps>): JSX.Element {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const cachedBusiness = useCallback(
    (target: string): CompanySummary | null => {
      const route = matchRoute(target);

      if (route.name !== 'catalog' && route.name !== 'booking') return null;

      const catalog =
        queryClient.getQueryData<CompanyCatalog>(
          ReactQueryConfig.companyCatalogQueryKey(
            route.slug,
            route.name === 'booking' ? route.productId : undefined,
          ),
        ) ??
        queryClient.getQueryData<CompanyCatalog>(
          ReactQueryConfig.companyCatalogQueryKey(route.slug),
        );

      return catalog?.business.slug === route.slug ? catalog.business : null;
    },
    [queryClient],
  );

  const [activePage, setActivePage] = useState<ActivePage>({
    pathname: initialPathname,
    element: initialPage,
  });

  const [loadError, setLoadError] = useState<unknown>();

  useEffect(() => {
    if (pathname === activePage.pathname) return;

    let active = true;
    const route = matchRoute(pathname);

    setLoadError(undefined);

    void loadPageComponents(route.name)
      .then((components) => {
        if (!active) return;
        const page = createPageElement(resolvePageData(route, {}), components);
        setActivePage({ pathname, element: page });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error);
      });

    return () => {
      active = false;
    };
  }, [activePage.pathname, loadPageComponents, pathname]);

  if (loadError !== undefined) throw loadError;

  if (pathname !== activePage.pathname) {
    return <FallbackLoading message="Carregando página..." business={cachedBusiness(pathname)} />;
  }

  return activePage.element;
}
