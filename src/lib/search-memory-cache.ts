import { SearchResult } from '@/lib/types';

const SEARCH_MEMORY_CACHE_TTL_MS = 10 * 60 * 1000;

export type SearchMemoryCacheEntry = {
  results: SearchResult[];
  totalSources: number;
  completedSources: number;
  cachedAt: number;
};

const SEARCH_MEMORY_CACHE = new Map<string, SearchMemoryCacheEntry>();

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function cleanupExpiredCache() {
  const now = Date.now();
  SEARCH_MEMORY_CACHE.forEach((entry, key) => {
    if (now - entry.cachedAt > SEARCH_MEMORY_CACHE_TTL_MS) {
      SEARCH_MEMORY_CACHE.delete(key);
    }
  });
}

export function getSearchMemoryCache(
  query: string,
): SearchMemoryCacheEntry | null {
  cleanupExpiredCache();
  const key = normalizeQuery(query);
  if (!key) return null;
  return SEARCH_MEMORY_CACHE.get(key) || null;
}

export function setSearchMemoryCache(
  query: string,
  entry: Omit<SearchMemoryCacheEntry, 'cachedAt'>,
) {
  const key = normalizeQuery(query);
  if (!key) return;
  SEARCH_MEMORY_CACHE.set(key, {
    ...entry,
    cachedAt: Date.now(),
  });
}

