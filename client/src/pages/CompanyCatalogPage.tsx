import { useMemo, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCompanyCatalog } from '../services/catalog.service';
import { ReactQueryConfig } from '../config/react-query.config';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';

type CompanyCatalogStatus = 'loading' | 'error' | 'unavailable' | 'not-found' | 'ready';

export default function CompanyCatalogPage(): JSX.Element {
  const { slug = '' } = useParams();

  const catalogQuery = useQuery({
    queryKey: ReactQueryConfig.companyCatalogQueryKey(slug),
    queryFn: () => getCompanyCatalog(slug),
    enabled: Boolean(slug),
  });

  const catalog = catalogQuery.data ?? null;

  const isUnavailable = useMemo<boolean>(
    () =>
      catalogQuery.error !== null &&
      typeof catalogQuery.error === 'object' &&
      'code' in catalogQuery.error &&
      (catalogQuery.error.code === 'unavailable' ||
        catalogQuery.error.code === 'firestore/unavailable'),
    [catalogQuery.error],
  );

  const status = useMemo<CompanyCatalogStatus>(
    () =>
      catalogQuery.isPending
        ? 'loading'
        : catalogQuery.isError
          ? isUnavailable
            ? 'unavailable'
            : 'error'
          : catalog
            ? 'ready'
            : 'not-found',
    [catalogQuery.isPending, catalogQuery.isError, isUnavailable, catalog],
  );

  return <CompanyCatalogTemplate catalog={catalog} status={status} />;
}
