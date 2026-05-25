import type { PlayRecord } from '@/lib/types';
import { cacheManager } from './cache-manager';
import { dispatchDataUpdate } from './events';
import { generateStorageKey } from './keys';

export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  if (typeof window === 'undefined') return {};
  return cacheManager.getCachedPlayRecords() || {};
}

export async function savePlayRecord(
  source: string,
  id: string,
  record: PlayRecord,
): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  cached[key] = record;
  cacheManager.cachePlayRecords(cached);
  dispatchDataUpdate('playRecordsUpdated', cached);
}

export async function deletePlayRecord(source: string, id: string): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  delete cached[key];
  cacheManager.cachePlayRecords(cached);
  dispatchDataUpdate('playRecordsUpdated', cached);
}

export async function clearAllPlayRecords(): Promise<void> {
  cacheManager.cachePlayRecords({});
  dispatchDataUpdate('playRecordsUpdated', {});
}
