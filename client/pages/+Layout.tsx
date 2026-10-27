import { useEffect, type ReactNode } from 'react';
import { addBreadcrumb, reactErrorHandler, withErrorBoundary } from '@sentry/react';
import { usePageContext } from 'vike-react/usePageContext';
import { initializeMonitoring } from '../src/config/sentry.config';
import { SentryUtil } from '../src/utils/sentry.util';
import FallbackError from '../src/components/atoms/FallbackError';
import '../src/styles/index.css';

type LayoutProps = { children: ReactNode };

function Layout({ children }: Readonly<LayoutProps>): ReactNode {
  const pageContext = usePageContext();

  useEffect(() => {
    initializeMonitoring();

    const breadcrumb = SentryUtil.createSafeRouteBreadcrumb(pageContext.urlPathname);
    if (breadcrumb) addBreadcrumb(breadcrumb);
  }, [pageContext.urlPathname]);

  return (
    <>
      <div className="route-progress" role="progressbar" aria-label="Carregando página">
        <span className="route-progress__indicator" />
      </div>
      {children}
    </>
  );
}

export default withErrorBoundary(Layout, {
  fallback: <FallbackError />,
  onError: reactErrorHandler(),
});
