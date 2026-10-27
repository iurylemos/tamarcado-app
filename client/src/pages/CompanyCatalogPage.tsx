import { useMemo, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CompanyCatalog } from '../interfaces/company.interface';
import type { PublicCatalogStatus } from '../interfaces/catalog.interface';
import { ReactQueryConfig } from '../config/react-query.config';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';

type CompanyCatalogPageProps = {
  slug: string;
  initialCatalog?: CompanyCatalog | null;
  initialStatus?: PublicCatalogStatus;
};

export default function CompanyCatalogPage({
  slug,
  initialCatalog,
  initialStatus,
}: Readonly<CompanyCatalogPageProps>): JSX.Element {
  const { data, error, isPending, isError } = useQuery({
    queryKey: ReactQueryConfig.companyCatalogQueryKey(slug),
    queryFn: () => getCompanyCatalog(slug),
    enabled: Boolean(slug),
    initialData: initialCatalog,
    staleTime: ReactQueryConfig.queryStaleTime,
  });

  const catalog = data ?? null;

  const isUnavailable = useMemo<boolean>(
    () =>
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'unavailable' || error.code === 'firestore/unavailable'),
    [error],
  );

  const status = useMemo<PublicCatalogStatus | 'loading'>(
    () =>
      initialStatus ??
      (isPending
        ? 'loading'
        : isError
          ? isUnavailable
            ? 'unavailable'
            : 'error'
          : catalog
            ? 'ready'
            : 'not-found'),
    [initialStatus, isPending, isError, isUnavailable, catalog],
  );

  return <CompanyCatalogTemplate catalog={catalog} status={status} />;
}
