import { useMemo, type JSX } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { CompanyCatalog } from '../interfaces/company.interface';
import type { CatalogCursor, PublicCatalogStatus } from '../interfaces/catalog.interface';
import { ReactQueryConfig } from '../config/react-query.config';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogTemplate from '../components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';
import { CatalogUtil } from '../utils/catalog.util';

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
  const { data, error, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
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
      ...(initialCatalog
        ? {
            initialData: {
              pages: [initialCatalog],
              pageParams: [undefined as CatalogCursor | undefined],
            },
          }
        : {}),
      staleTime: ReactQueryConfig.queryStaleTime,
    });

  const catalog = useMemo<CompanyCatalog | null>(() => {
    const [first] = data?.pages ?? [];

    if (!first) return null;

    return { ...first, products: data!.pages.flatMap((page) => page?.products ?? []) };
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

  return (
    <CompanyCatalogTemplate
      catalog={catalog}
      status={status}
      hasMore={Boolean(hasNextPage)}
      loadingMore={isFetchingNextPage}
      onLoadMore={() => {
        void fetchNextPage();
      }}
    />
  );
}
