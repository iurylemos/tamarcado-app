import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureMonitoringInitialized } from '../config/sentry-loader';
import { resolvePageMeta, updatePageMeta } from './page-meta';
import { RouteUtil } from '../utils/route.util';

type LayoutProps = { children: ReactNode };

export default function Layout({ children }: Readonly<LayoutProps>): ReactNode {
  const { pathname } = useLocation();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    if (initialPathname.current === pathname) return;

    void ensureMonitoringInitialized()
      .then(({ addRouteBreadcrumb }) => addRouteBreadcrumb(pathname))
      .catch((error: unknown) => {
        console.error('Failed to add Sentry route breadcrumb.', error);
      });

    const route = RouteUtil.matchRoute(pathname);

    if (route.name === 'home' || route.name === 'not-found') {
      return updatePageMeta(resolvePageMeta({ name: route.name }));
    }
  }, [pathname]);

  return children;
}
