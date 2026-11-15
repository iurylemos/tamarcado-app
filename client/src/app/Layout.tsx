import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { addBreadcrumb, reactErrorHandler, withErrorBoundary } from '@sentry/react';
import { initializeMonitoring } from '../config/sentry.config';
import { SentryUtil } from '../utils/sentry.util';
import FallbackError from '../components/atoms/FallbackError';
import { resolvePageMeta, updatePageMeta } from './page-meta';
import { RouteUtil } from '../utils/route.util';

type LayoutProps = { children: ReactNode };

function Layout({ children }: Readonly<LayoutProps>): ReactNode {
  const { pathname } = useLocation();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    initializeMonitoring();

    const breadcrumb = SentryUtil.createSafeRouteBreadcrumb(pathname);
    if (breadcrumb) addBreadcrumb(breadcrumb);

    if (initialPathname.current === pathname) return;

    const route = RouteUtil.matchRoute(pathname);

    if (route.name === 'home' || route.name === 'not-found') {
      return updatePageMeta(resolvePageMeta({ name: route.name }));
    }
  }, [pathname]);

  return children;
}

export default withErrorBoundary(Layout, {
  fallback: <FallbackError />,
  onError: (error: unknown, componentStack: string) =>
    reactErrorHandler()(error, { componentStack }),
});
