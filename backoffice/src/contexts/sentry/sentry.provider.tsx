import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { SentryContext } from './sentry.context';
import { useLocation } from 'react-router-dom';
import { addBreadcrumb, type Breadcrumb } from '@sentry/react';
import { SentryUtil } from '../../utils/sentry.util';

type SentryProviderProps = {
  children: ReactNode;
};

export default function SentryProvider({ children }: Readonly<SentryProviderProps>): JSX.Element {
  const { pathname } = useLocation();
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb | null>(() =>
    SentryUtil.createSafeRouteBreadcrumb(pathname),
  );

  useEffect(() => {
    const breadcrumb = SentryUtil.createSafeRouteBreadcrumb(pathname);

    if (breadcrumb) {
      addBreadcrumb(breadcrumb);
      setBreadcrumb(breadcrumb);
    }
  }, [pathname]);

  return <SentryContext.Provider value={{ breadcrumb }}>{children}</SentryContext.Provider>;
}
