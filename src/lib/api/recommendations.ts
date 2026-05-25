import type { RecommendationHomeResult } from '@/lib/types';
import { apiJson } from './client';

export async function fetchRecommendations(signal?: AbortSignal): Promise<RecommendationHomeResult> {
  return apiJson<RecommendationHomeResult>('/api/recommendations', { signal });
}
