import type { PlayRecord } from '@/lib/types';

export const CACHE_VERSION = '4.0.0';
const STORAGE_KEY = 'vodhub_cache';

interface CacheEntry<T> {
  data: T;
  version: string;
}

interface CacheStore {
  playRecords?: CacheEntry<Record<string, PlayRecord>>;
  searchHistory?: CacheEntry<string[]>;
}

function readStore(): CacheStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota or serialization error — silently drop */
  }
}

function getField<T>(field: keyof CacheStore): T | null {
  const store = readStore();
  const entry = store[field];
  if (!entry) return null;
  if (entry.version !== CACHE_VERSION) {
    delete store[field];
    writeStore(store);
    return null;
  }
  return entry.data as unknown as T;
}

function setField<T>(field: keyof CacheStore, data: T): void {
  const store = readStore();
  (store as Record<string, CacheEntry<unknown>>)[field] = { data, version: CACHE_VERSION };
  writeStore(store);
}

export const cacheManager = {
  getCachedPlayRecords(): Record<string, PlayRecord> | null {
    return getField<Record<string, PlayRecord>>('playRecords');
  },
  cachePlayRecords(data: Record<string, PlayRecord>): void {
    setField('playRecords', data);
  },
  getCachedSearchHistory(): string[] | null {
    return getField<string[]>('searchHistory');
  },
  cacheSearchHistory(data: string[]): void {
    setField('searchHistory', data);
  },
};
