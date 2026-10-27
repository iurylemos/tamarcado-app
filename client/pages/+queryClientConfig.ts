import { ReactQueryConfig } from '../src/config/react-query.config';

export default {
  defaultOptions: {
    queries: {
      staleTime: ReactQueryConfig.queryStaleTime,
      retry: (failureCount: number, error: unknown): boolean =>
        !ReactQueryConfig.isNonRetryableFirebaseError(error) && failureCount < 2,
      retryDelay: (attempt: number): number => Math.min(1_000 * 2 ** attempt, 8_000),
      refetchOnWindowFocus: false,
    },
  },
};
