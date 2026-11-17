import { useEffect, useMemo, type JSX } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanyCatalog, CompanySummary } from '../interfaces/company.interface';
import type { CatalogCursor, PublicCatalogStatus } from '../interfaces/catalog.interface';
import { ReactQueryConfig } from '../config/react-query.config';
import { CatalogService } from '../services/catalog.service';
import { CatalogUtil } from '../utils/catalog.util';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';
import BusinessTheme from '../app/BusinessTheme';

type CompanyCatalogData = {
  catalog: CompanyCatalog | null;
  status: PublicCatalogStatus | 'loading';
};

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
    queryFn: async ({ pageParam }): Promise<CompanyCatalog | null> => {
      return CatalogService.getCompanyCatalog(slug, {
        pageSize: CatalogUtil.defaultLimitPageSize,
        after: pageParam,
      });
    },
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

  const { catalog, status } = useMemo<CompanyCatalogData>(() => {
    const catalog = CatalogUtil.getCatalogByPage(data);
    const isUnavailable = CatalogUtil.checkCatalogAvailability(error);
    const status = CatalogUtil.checkCatalogStatus(
      isPending,
      isError,
      isUnavailable,
      catalog,
      isFetched,
      initialBusiness,
    );

    return {
      catalog,
      status,
    };
  }, [data, error, initialBusiness, isError, isPending, isFetched]);

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
