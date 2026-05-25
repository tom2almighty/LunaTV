import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchRecommendations } from '@/lib/api/douban';
import type { RecommendationHomeResult } from '@/lib/types';

export function useRecommendations(): UseQueryResult<RecommendationHomeResult, Error> {
  return useQuery<RecommendationHomeResult, Error>({
    queryKey: ['recommendations'],
    queryFn: ({ signal }) => fetchRecommendations(signal),
  });
}
