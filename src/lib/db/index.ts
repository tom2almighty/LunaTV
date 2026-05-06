export { cacheManager } from './cache-manager';
export { generateStorageKey } from './keys';
export {
  getAllPlayRecords, savePlayRecord, deletePlayRecord, clearAllPlayRecords,
} from './play-records';
export {
  getSearchHistory, addSearchHistory, deleteSearchHistory, clearSearchHistory,
} from './search-history';

export type { PlayRecord } from '../types';

export type CacheUpdateEvent =
  | 'playRecordsUpdated'
  | 'searchHistoryUpdated';

export function subscribeToDataUpdates<T>(
  eventType: CacheUpdateEvent,
  callback: (data: T) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: CustomEvent) => callback(e.detail);
  window.addEventListener(eventType, handler as EventListener);
  return () => window.removeEventListener(eventType, handler as EventListener);
}
