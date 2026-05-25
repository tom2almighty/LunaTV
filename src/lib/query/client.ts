import { QueryClient } from '@tanstack/react-query';
import { getCachedRecommendations } from '@/lib/db/recommendations-cache';
import { queryKeys } from './keys';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Seed local caches into the query cache once at startup so that initial
// renders can read from disk without each hook needing initialData.
if (typeof window !== 'undefined') {
  const recommendations = getCachedRecommendations();
  if (recommendations) {
    queryClient.setQueryData(queryKeys.recommendations, recommendations);
  }
}
