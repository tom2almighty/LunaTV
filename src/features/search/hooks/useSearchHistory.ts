import { useEffect } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSearchHistory } from '@/lib/db/search-history';
import { subscribeToDataUpdates } from '@/lib/db/events';
import { queryKeys } from '@/lib/query/keys';

export function useSearchHistory(): UseQueryResult<string[], Error> {
  const queryClient = useQueryClient();
  const query = useQuery<string[], Error>({
    queryKey: [...queryKeys.searchHistory],
    queryFn: () => getSearchHistory(),
    staleTime: Infinity,
  });

  useEffect(() => {
    return subscribeToDataUpdates<string[]>('searchHistoryUpdated', (data) => {
      queryClient.setQueryData(queryKeys.searchHistory, data);
    });
  }, [queryClient]);

  return query;
}
