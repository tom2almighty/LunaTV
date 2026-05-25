import type { RecommendationItem } from '@/lib/types';
import { apiJson } from './client';

export interface DoubanCategoryParams {
  kind: 'movie' | 'tv';
  category: string;
  type: string;
  start?: number;
  limit?: number;
}

export interface DoubanCategoryResult {
  items: RecommendationItem[];
  total: number;
}

export async function fetchDoubanCategory(
  params: DoubanCategoryParams,
  signal?: AbortSignal,
): Promise<DoubanCategoryResult> {
  const search = new URLSearchParams({
    kind: params.kind,
    category: params.category,
    type: params.type,
    start: String(params.start ?? 0),
    limit: String(params.limit ?? 18),
  });
  return apiJson<DoubanCategoryResult>(`/api/douban/category?${search.toString()}`, { signal });
}
