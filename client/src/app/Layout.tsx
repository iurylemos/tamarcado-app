import { useEffect, type ReactNode } from 'react';
import { addBreadcrumb, reactErrorHandler, withErrorBoundary } from '@sentry/react';
import { initializeMonitoring } from '../config/sentry.config';
import { SentryUtil } from '../utils/sentry.util';
import FallbackError from '../components/atoms/FallbackError';

type LayoutProps = { pathname: string; children: ReactNode };

function Layout({ pathname, children }: Readonly<LayoutProps>): ReactNode {
  useEffect(() => {
    initializeMonitoring();

    const breadcrumb = SentryUtil.createSafeRouteBreadcrumb(pathname);
    if (breadcrumb) addBreadcrumb(breadcrumb);
  }, [pathname]);

  return children;
}

export default withErrorBoundary(Layout, {
  fallback: <FallbackError />,
  onError: (error: unknown, componentStack: string) =>
    reactErrorHandler()(error, { componentStack }),
});
