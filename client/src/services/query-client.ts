import { QueryClient } from '@tanstack/react-query';

export const companyCatalogQueryKey = (slug: string) => ['company-catalog', slug] as const;
export const availabilityQueryKey = (businessSlug: string, productId: string, date: string) =>
  ['availability', businessSlug, productId, date] as const;
export const availabilitySearchQueryKey = (businessSlug: string, productId: string, date: string) =>
  ['availability-search', businessSlug, productId, date] as const;

function isNonRetryableFirebaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;

  const { code } = error;
  return (
    typeof code === 'string' &&
    [
      'permission-denied',
      'unauthenticated',
      'invalid-argument',
      'not-found',
      'functions/permission-denied',
      'functions/unauthenticated',
      'functions/invalid-argument',
      'functions/not-found',
    ].includes(code)
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) => !isNonRetryableFirebaseError(error) && failureCount < 2,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
      refetchOnWindowFocus: false,
    },
  },
});
