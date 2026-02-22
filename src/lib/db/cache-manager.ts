/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
'use client';

import { getAuthInfoFromBrowserCookie } from '../auth';
import { Favorite, PlayRecord, SkipConfig } from '../types';

// ---- 缓存数据结构 ----
interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface UserCacheStore {
  playRecords?: CacheData<Record<string, PlayRecord>>;
  favorites?: CacheData<Record<string, Favorite>>;
  searchHistory?: CacheData<string[]>;
  skipConfigs?: CacheData<Record<string, SkipConfig>>;
}

const CACHE_PREFIX = 'moontv_cache_';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRE_TIME = 60 * 60 * 1000; // 1小时

class HybridCacheManager {
  private static instance: HybridCacheManager;

  static getInstance(): HybridCacheManager {
    if (!HybridCacheManager.instance) {
      HybridCacheManager.instance = new HybridCacheManager();
    }
    return HybridCacheManager.instance;
  }

  getCurrentUsername(): string | null {
    return getAuthInfoFromBrowserCookie()?.username || null;
  }

  private getUserCacheKey(username: string): string {
    return `${CACHE_PREFIX}${username}`;
  }

  private getUserCache(username: string): UserCacheStore {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem(this.getUserCacheKey(username));
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }

  private saveUserCache(username: string, cache: UserCacheStore): void {
    if (typeof window === 'undefined') return;
    try {
      if (JSON.stringify(cache).length > 15 * 1024 * 1024) {
        this.cleanOldCache(cache);
      }
      localStorage.setItem(
        this.getUserCacheKey(username),
        JSON.stringify(cache),
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        this.clearAllCache();
        try {
          localStorage.setItem(
            this.getUserCacheKey(username),
            JSON.stringify(cache),
          );
        } catch (e) {
          console.error('重试保存缓存仍然失败:', e);
        }
      }
    }
  }

  private cleanOldCache(cache: UserCacheStore): void {
    const now = Date.now();
    const maxAge = 60 * 24 * 60 * 60 * 1000; // 两个月
    if (cache.playRecords && now - cache.playRecords.timestamp > maxAge)
      delete cache.playRecords;
    if (cache.favorites && now - cache.favorites.timestamp > maxAge)
      delete cache.favorites;
  }

  private clearAllCache(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('moontv_cache_'))
      .forEach((k) => localStorage.removeItem(k));
  }

  isCacheValid<T>(cache: CacheData<T>): boolean {
    return (
      cache.version === CACHE_VERSION &&
      Date.now() - cache.timestamp < CACHE_EXPIRE_TIME
    );
  }

  private createCacheData<T>(data: T): CacheData<T> {
    return { data, timestamp: Date.now(), version: CACHE_VERSION };
  }

  private get<T>(field: keyof UserCacheStore): T | null {
    const username = this.getCurrentUsername();
    if (!username) return null;
    const entry = this.getUserCache(username)[field] as
      | CacheData<T>
      | undefined;
    return entry && this.isCacheValid(entry) ? entry.data : null;
  }

  private set<T>(field: keyof UserCacheStore, data: T): void {
    const username = this.getCurrentUsername();
    if (!username) return;
    const cache = this.getUserCache(username);
    (cache as any)[field] = this.createCacheData(data);
    this.saveUserCache(username, cache);
  }

  getCachedPlayRecords = () =>
    this.get<Record<string, PlayRecord>>('playRecords');
  cachePlayRecords = (d: Record<string, PlayRecord>) =>
    this.set('playRecords', d);

  getCachedFavorites = () => this.get<Record<string, Favorite>>('favorites');
  cacheFavorites = (d: Record<string, Favorite>) => this.set('favorites', d);

  getCachedSearchHistory = () => this.get<string[]>('searchHistory');
  cacheSearchHistory = (d: string[]) => this.set('searchHistory', d);

  getCachedSkipConfigs = () =>
    this.get<Record<string, SkipConfig>>('skipConfigs');
  cacheSkipConfigs = (d: Record<string, SkipConfig>) =>
    this.set('skipConfigs', d);

  clearUserCache(username?: string): void {
    const target = username || this.getCurrentUsername();
    if (!target) return;
    try {
      localStorage.removeItem(this.getUserCacheKey(target));
    } catch {
      /* noop */
    }
  }

  clearExpiredCaches(): void {
    if (typeof window === 'undefined') return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(CACHE_PREFIX)) continue;
        try {
          const cache = JSON.parse(localStorage.getItem(key) || '{}');
          const hasValid = Object.values(cache).some(
            (v) => v && this.isCacheValid(v as CacheData<any>),
          );
          if (!hasValid) toRemove.push(key);
        } catch {
          toRemove.push(key as string);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  }
}

export const cacheManager = HybridCacheManager.getInstance();
