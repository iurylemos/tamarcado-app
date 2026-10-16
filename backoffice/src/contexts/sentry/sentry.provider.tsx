import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { SentryContext } from './sentry.context';
import { useLocation } from 'react-router-dom';
import { createSafeRouteBreadcrumb, initializeMonitoring } from '../../config/sentry.config';
import { addBreadcrumb, type Breadcrumb } from '@sentry/react';

type SentryProviderProps = {
  children: ReactNode;
};

export default function SentryProvider({ children }: Readonly<SentryProviderProps>): JSX.Element {
  const { pathname } = useLocation();
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb | null>(() =>
    createSafeRouteBreadcrumb(pathname),
  );

  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    const breadcrumb = createSafeRouteBreadcrumb(pathname);

    if (breadcrumb) {
      addBreadcrumb(breadcrumb);
      setBreadcrumb(breadcrumb);
    }
  }, [pathname]);

  return <SentryContext.Provider value={{ breadcrumb }}>{children}</SentryContext.Provider>;
}
