import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCompanyCatalog } from '../services/catalog.service';
import { companyCatalogQueryKey } from '../services/query-client';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';

export default function CompanyCatalogPage(): JSX.Element {
  const { slug = '' } = useParams();
  const catalogQuery = useQuery({
    queryKey: companyCatalogQueryKey(slug),
    queryFn: () => getCompanyCatalog(slug),
    enabled: Boolean(slug),
  });

  const catalog = catalogQuery.data ?? null;
  const isUnavailable =
    catalogQuery.error !== null &&
    typeof catalogQuery.error === 'object' &&
    'code' in catalogQuery.error &&
    (catalogQuery.error.code === 'unavailable' ||
      catalogQuery.error.code === 'firestore/unavailable');
  const status = catalogQuery.isPending
    ? 'loading'
    : catalogQuery.isError
      ? isUnavailable
        ? 'unavailable'
        : 'error'
      : catalog
        ? 'ready'
        : 'not-found';

  return <CompanyCatalogTemplate catalog={catalog} status={status} />;
}
