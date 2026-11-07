import type { JSX } from 'react';
import type { PublicCatalogStatus } from '../interfaces/catalog.interface';
import type { CompanySummary } from '../interfaces/company.interface';
import CompanyCatalogPage from './CompanyCatalogPage';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';

type CatalogRoutePageProps = {
  slug: string;
  initialBusiness?: CompanySummary | null;
  status?: PublicCatalogStatus;
};

export default function CatalogRoutePage({
  slug,
  initialBusiness,
  status,
}: Readonly<CatalogRoutePageProps>): JSX.Element {
  if (status && status !== 'ready') {
    return <CompanyCatalogTemplate catalog={null} status={status} />;
  }

  return <CompanyCatalogPage slug={slug} initialBusiness={initialBusiness} />;
}
