import { addBreadcrumb } from '@sentry/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createSafeRouteBreadcrumb } from '../config/sentry.config';

export function useRouteBreadcrumb(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const breadcrumb = createSafeRouteBreadcrumb(pathname);

    if (breadcrumb) {
      addBreadcrumb(breadcrumb);
    }
  }, [pathname]);
}
