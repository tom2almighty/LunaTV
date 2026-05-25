export type CacheUpdateEvent = 'playRecordsUpdated' | 'searchHistoryUpdated';

export function subscribeToDataUpdates<T>(
  eventType: CacheUpdateEvent,
  callback: (data: T) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => callback((e as CustomEvent<T>).detail);
  window.addEventListener(eventType, handler);
  return () => window.removeEventListener(eventType, handler);
}

export function dispatchDataUpdate<T>(eventType: CacheUpdateEvent, detail: T): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventType, { detail }));
}
