import { generateStorageKey } from './keys';
import { cacheManager } from './cache-manager';
import type { PlayRecord } from '../types';

export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  if (typeof window === 'undefined') return {};
  return cacheManager.getCachedPlayRecords() || {};
}

export async function savePlayRecord(source: string, id: string, record: PlayRecord): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  cached[key] = record;
  cacheManager.cachePlayRecords(cached);
  window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: cached }));
}

export async function deletePlayRecord(source: string, id: string): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  delete cached[key];
  cacheManager.cachePlayRecords(cached);
  window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: cached }));
}

export async function clearAllPlayRecords(): Promise<void> {
  cacheManager.cachePlayRecords({});
  window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: {} }));
}
