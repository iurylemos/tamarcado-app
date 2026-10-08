import { useMemo, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPublicCompanies } from '../services/company.service';
import { listPublicProducts } from '../services/product.service';
import type { CompanySummary } from '../interfaces/company.interface';
import { publicCompaniesQueryKey, publicProductsQueryKey } from '../services/query-client';
import { useCatalogFiltersStore } from '../stores/catalog-filters.store';
import CompanyListTemplate from '../components/templates/CompanyListTemplate/CompanyListTemplate';

const EMPTY_COMPANIES: CompanySummary[] = [];

export default function CompanyListPage(): JSX.Element {
  const segment = useCatalogFiltersStore((state) => state.segment);
  const tab = useCatalogFiltersStore((state) => state.tab);
  const search = useCatalogFiltersStore((state) => state.search);
  const setSegment = useCatalogFiltersStore((state) => state.setSegment);
  const setTab = useCatalogFiltersStore((state) => state.setTab);
  const setSearch = useCatalogFiltersStore((state) => state.setSearch);
  const companiesQuery = useQuery({
    queryKey: publicCompaniesQueryKey(segment || undefined),
    queryFn: () => listPublicCompanies(segment || undefined),
  });
  const productsQuery = useQuery({
    queryKey: publicProductsQueryKey,
    queryFn: listPublicProducts,
  });
  const companies = companiesQuery.data ?? EMPTY_COMPANIES;
  const products = productsQuery.data ?? [];
  const error = companiesQuery.isError || productsQuery.isError;
  const loading = !error && (companiesQuery.isPending || productsQuery.isPending);

  const term = search.trim().toLowerCase();

  const companyBySlug = useMemo(
    () => new Map(companies.map((company) => [company.slug, company])),
    [companies],
  );

  const visibleCompanies = companies.filter((company) => company.name.toLowerCase().includes(term));
  const visibleProducts = products.filter((product) => {
    const store = companyBySlug.get(product.businessSlug);
    if (segment && !store) return false;
    return (
      product.name.toLowerCase().includes(term) ||
      (store?.name.toLowerCase().includes(term) ?? false)
    );
  });

  return (
    <CompanyListTemplate
      companies={visibleCompanies}
      products={visibleProducts}
      companyBySlug={companyBySlug}
      loading={loading}
      error={error}
      segment={segment}
      tab={tab}
      search={search}
      onSegmentChange={setSegment}
      onTabChange={setTab}
      onSearchChange={setSearch}
    />
  );
}
