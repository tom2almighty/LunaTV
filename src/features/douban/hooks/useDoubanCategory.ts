import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import {
  fetchDoubanCategory,
  type DoubanCategoryResult,
  type DoubanKind,
} from '@/lib/api/douban';
import { queryKeys } from '@/lib/query/keys';

const THIRTY_MINUTES = 30 * 60 * 1000;
const PAGE_SIZE = 18;

export interface DoubanCategoryKey {
  kind: DoubanKind;
  type: string;
}

export function useDoubanCategory(
  key: DoubanCategoryKey,
): UseInfiniteQueryResult<InfiniteData<DoubanCategoryResult, number>, Error> {
  return useInfiniteQuery<
    DoubanCategoryResult,
    Error,
    InfiniteData<DoubanCategoryResult, number>,
    ReturnType<typeof queryKeys.douban>,
    number
  >({
    queryKey: queryKeys.douban(key),
    queryFn: ({ pageParam = 0, signal }) =>
      fetchDoubanCategory({ ...key, start: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.items?.length || lastPage.items.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    staleTime: THIRTY_MINUTES,
  });
}
