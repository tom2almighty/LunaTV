/* eslint-disable no-console, @typescript-eslint/no-empty-function */
'use client';

/**
 * 客户端数据层统一入口（仅供前端组件/Hook 使用）
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

import { cacheManager } from './cache-manager';

export type { Favorite, PlayRecord, SkipConfig } from '../types';

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
