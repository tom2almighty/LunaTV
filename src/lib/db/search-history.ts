import { cacheManager } from './cache-manager';

const SEARCH_HISTORY_LIMIT = 20;

export async function getSearchHistory(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  return cacheManager.getCachedSearchHistory() || [];
}

export async function addSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;
  const history = cacheManager.getCachedSearchHistory() || [];
  const next = [trimmed, ...history.filter((k) => k !== trimmed)].slice(0, SEARCH_HISTORY_LIMIT);
  cacheManager.cacheSearchHistory(next);
  window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: next }));
}

export async function deleteSearchHistory(keyword: string): Promise<void> {
  const next = (cacheManager.getCachedSearchHistory() || []).filter((k) => k !== keyword.trim());
  cacheManager.cacheSearchHistory(next);
  window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: next }));
}

export async function clearSearchHistory(): Promise<void> {
  cacheManager.cacheSearchHistory([]);
  window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: [] }));
}
