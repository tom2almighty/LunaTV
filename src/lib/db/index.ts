export { cacheManager, CACHE_VERSION } from './cache-manager';
export { generateStorageKey, parseStorageKey } from './keys';
export {
  subscribeToDataUpdates,
  dispatchDataUpdate,
  type CacheUpdateEvent,
} from './events';
export {
  getAllPlayRecords,
  savePlayRecord,
  deletePlayRecord,
  clearAllPlayRecords,
} from './play-records';
export {
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistory,
  clearSearchHistory,
} from './search-history';
export {
  getCachedRecommendations,
  setCachedRecommendations,
} from './recommendations-cache';
