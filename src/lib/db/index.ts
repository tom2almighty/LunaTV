/* eslint-disable no-console, @typescript-eslint/no-empty-function */
'use client';

/**
 * db/ 统一入口 — 重导出所有公共 API
 * 外部代码可直接从 '@/lib/db' 或继续从 '@/lib/db.client' 导入
 */

export { generateStorageKey, triggerGlobalError } from './api-client';
export { cacheManager } from './cache-manager';
export {
  clearAllFavorites,
  deleteFavorite,
  getAllFavorites,
  isFavorited,
  saveFavorite,
} from './favorites';
export {
  clearAllPlayRecords,
  deletePlayRecord,
  getAllPlayRecords,
  savePlayRecord,
} from './play-records';
export {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
} from './search-history';
export {
  deleteSkipConfig,
  getAllSkipConfigs,
  getSkipConfig,
  saveSkipConfig,
} from './skip-configs';

import { fetchFromApi, triggerGlobalError } from './api-client';
import { cacheManager } from './cache-manager';
import { getAuthInfoFromBrowserCookie } from '../auth';
import { Favorite, PlayRecord, SkipConfig } from '../types';

// 页面加载时清理过期缓存
if (typeof window !== 'undefined') {
  setTimeout(() => cacheManager.clearExpiredCaches(), 1000);
}

export type CacheUpdateEvent =
  | 'playRecordsUpdated'
  | 'favoritesUpdated'
  | 'searchHistoryUpdated'
  | 'skipConfigsUpdated';

export function subscribeToDataUpdates<T>(
  eventType: CacheUpdateEvent,
  callback: (data: T) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: CustomEvent) => callback(e.detail);
  window.addEventListener(eventType, handler as EventListener);
  return () => window.removeEventListener(eventType, handler as EventListener);
}

export function clearUserCache(): void {
  cacheManager.clearUserCache();
}

export function getCacheStatus() {
  const authInfo = getAuthInfoFromBrowserCookie();
  return {
    hasPlayRecords: !!cacheManager.getCachedPlayRecords(),
    hasFavorites: !!cacheManager.getCachedFavorites(),
    hasSearchHistory: !!cacheManager.getCachedSearchHistory(),
    hasSkipConfigs: !!cacheManager.getCachedSkipConfigs(),
    username: authInfo?.username || null,
  };
}

export async function refreshAllCache(): Promise<void> {
  try {
    const [playRecords, favorites, searchHistory, skipConfigs] =
      await Promise.allSettled([
        fetchFromApi<Record<string, PlayRecord>>('/api/playrecords'),
        fetchFromApi<Record<string, Favorite>>('/api/favorites'),
        fetchFromApi<string[]>('/api/searchhistory'),
        fetchFromApi<Record<string, SkipConfig>>('/api/skipconfigs'),
      ]);

    if (playRecords.status === 'fulfilled') {
      cacheManager.cachePlayRecords(playRecords.value);
      window.dispatchEvent(
        new CustomEvent('playRecordsUpdated', { detail: playRecords.value }),
      );
    }
    if (favorites.status === 'fulfilled') {
      cacheManager.cacheFavorites(favorites.value);
      window.dispatchEvent(
        new CustomEvent('favoritesUpdated', { detail: favorites.value }),
      );
    }
    if (searchHistory.status === 'fulfilled') {
      cacheManager.cacheSearchHistory(searchHistory.value);
      window.dispatchEvent(
        new CustomEvent('searchHistoryUpdated', {
          detail: searchHistory.value,
        }),
      );
    }
    if (skipConfigs.status === 'fulfilled') {
      cacheManager.cacheSkipConfigs(skipConfigs.value);
      window.dispatchEvent(
        new CustomEvent('skipConfigsUpdated', { detail: skipConfigs.value }),
      );
    }
  } catch (err) {
    console.error('刷新缓存失败:', err);
    triggerGlobalError('刷新缓存失败');
  }
}

export async function preloadUserData(): Promise<void> {
  const status = getCacheStatus();
  if (
    status.hasPlayRecords &&
    status.hasFavorites &&
    status.hasSearchHistory &&
    status.hasSkipConfigs
  )
    return;
  refreshAllCache().catch((err) => {
    console.warn('预加载用户数据失败:', err);
    triggerGlobalError('预加载用户数据失败');
  });
}
