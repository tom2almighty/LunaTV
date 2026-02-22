/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function */
'use client';

/**
 * 向后兼容层 — 所有实现已迁移至 src/lib/db/
 * 保留此文件以避免破坏现有导入路径
 */

export type { CacheUpdateEvent } from './db/index';
export {
  addSearchHistory,
  clearAllFavorites,
  clearAllPlayRecords,
  clearSearchHistory,
  clearUserCache,
  deleteFavorite,
  deletePlayRecord,
  deleteSearchHistory,
  deleteSkipConfig,
  generateStorageKey,
  getAllFavorites,
  getAllPlayRecords,
  getAllSkipConfigs,
  getCacheStatus,
  getSearchHistory,
  getSkipConfig,
  isFavorited,
  preloadUserData,
  refreshAllCache,
  saveFavorite,
  savePlayRecord,
  saveSkipConfig,
  subscribeToDataUpdates,
  triggerGlobalError,
} from './db/index';
export type { Favorite, PlayRecord } from './types';
