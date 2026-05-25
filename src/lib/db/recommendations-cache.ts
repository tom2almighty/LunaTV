import type { RecommendationHomeResult } from '@/lib/types';

const CACHE_KEY = 'vodhub_recommendations';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  data: RecommendationHomeResult;
  timestamp: number;
}

export function getCachedRecommendations(): RecommendationHomeResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedRecommendations(data: RecommendationHomeResult): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() } satisfies CacheEntry));
  } catch {
    /* quota */
  }
}
