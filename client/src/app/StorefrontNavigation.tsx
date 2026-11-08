import { useEffect, useState, type JSX } from 'react';
import { useLocation } from 'react-router-dom';
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
    return <FallbackLoading message="Carregando página..." />;
  }

  return activePage.element;
}
