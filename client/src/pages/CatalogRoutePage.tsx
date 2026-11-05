import type { JSX } from 'react';
import type { PublicCatalogStatus } from '../interfaces/catalog.interface';
import CompanyCatalogPage from './CompanyCatalogPage';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';

type CatalogRoutePageProps = {
  slug: string;
  status?: PublicCatalogStatus;
};

export default function CatalogRoutePage({
  slug,
  status,
}: Readonly<CatalogRoutePageProps>): JSX.Element {
  if (status && status !== 'ready') {
    return <CompanyCatalogTemplate catalog={null} status={status} />;
  }

  return <CompanyCatalogPage slug={slug} />;
}
