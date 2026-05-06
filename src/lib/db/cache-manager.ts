/* eslint-disable @typescript-eslint/no-explicit-any */
const STORAGE_KEY = 'vodhub_cache';
const CACHE_VERSION = '3.0.0';

interface CacheEntry<T> { data: T; version: string; }

interface UserCacheStore {
  playRecords?: CacheEntry<Record<string, any>>;
  searchHistory?: CacheEntry<string[]>;
}

class CacheManager {
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) CacheManager.instance = new CacheManager();
    return CacheManager.instance;
  }

  private read(): UserCacheStore {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private write(store: UserCacheStore): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* quota */ }
  }

  private get<T>(field: keyof UserCacheStore): T | null {
    const store = this.read();
    const entry = store[field];
    if (!entry) return null;
    if (entry.version !== CACHE_VERSION) {
      delete store[field];
      this.write(store);
      return null;
    }
    return entry.data as unknown as T;
  }

  private set(field: keyof UserCacheStore, data: any): void {
    const store = this.read();
    (store as any)[field] = { data, version: CACHE_VERSION };
    this.write(store);
  }

  getCachedPlayRecords(): Record<string, any> | null {
    return this.get('playRecords');
  }
  cachePlayRecords(data: Record<string, any>): void {
    this.set('playRecords', data);
  }

  getCachedSearchHistory(): string[] | null {
    return this.get('searchHistory');
  }
  cacheSearchHistory(data: string[]): void {
    this.set('searchHistory', data);
  }
}

export const cacheManager = CacheManager.getInstance();
