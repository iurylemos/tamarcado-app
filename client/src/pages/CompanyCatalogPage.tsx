import { useEffect, useMemo, type JSX } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanyCatalog, CompanySummary } from '../interfaces/company.interface';
import type { CatalogCursor, PublicCatalogStatus } from '../interfaces/catalog.interface';
import { ReactQueryConfig } from '../config/react-query.config';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';
import { CatalogUtil } from '../utils/catalog.util';
import BusinessTheme from '../app/BusinessTheme';

type CompanyCatalogPageProps = {
  slug: string;
  initialBusiness?: CompanySummary | null;
};

export default function CompanyCatalogPage({
  slug,
  initialBusiness,
}: Readonly<CompanyCatalogPageProps>): JSX.Element {
  const queryClient = useQueryClient();
  const {
    data,
    error,
    isPending,
    isFetched,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [...ReactQueryConfig.companyCatalogQueryKey(slug), 'pages'],
    queryFn: ({ pageParam }) =>
      getCompanyCatalog(slug, { pageSize: CatalogUtil.defaultLimitPageSize, after: pageParam }),
    initialPageParam: undefined as CatalogCursor | undefined,
    getNextPageParam: (lastPage: CompanyCatalog | null): CatalogCursor | null => {
      if (!lastPage) return null;

      const last = lastPage.products.at(-1);

      return lastPage.hasMore && last ? { id: last.id, name: last.name } : null;
    },
    enabled: Boolean(slug),
    staleTime: ReactQueryConfig.queryStaleTime,
    initialData: initialBusiness
      ? {
          pages: [{ business: initialBusiness, products: [], hasMore: true }],
          pageParams: [undefined],
        }
      : undefined,
    initialDataUpdatedAt: 0,
  });

  const catalog = useMemo<CompanyCatalog | null>(() => {
    const pages = data?.pages ?? [];
    const [first] = pages;

    if (!first) return null;

    return { ...first, products: pages.flatMap((page) => page?.products ?? []) };
  }, [data]);

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
      isPending || (initialBusiness != null && !isFetched)
        ? 'loading'
        : isError
          ? isUnavailable
            ? 'unavailable'
            : 'error'
          : catalog
            ? 'ready'
            : 'not-found',
    [isPending, isFetched, isError, isUnavailable, catalog, initialBusiness],
  );

  useEffect(() => {
    if (catalog) {
      queryClient.setQueryData(ReactQueryConfig.companyCatalogQueryKey(slug), catalog);
    }
  }, [catalog, queryClient, slug]);

  return (
    <BusinessTheme slug={slug} business={catalog?.business ?? initialBusiness}>
      <CompanyCatalogTemplate
        catalog={catalog}
        promotions={catalog?.promotions ?? []}
        status={status}
        hasMore={Boolean(hasNextPage)}
        loadingMore={isFetchingNextPage}
        onLoadMore={() => {
          void fetchNextPage();
        }}
      />
    </BusinessTheme>
  );
}
