/* eslint-disable no-console */
'use client';

import { Favorite } from '../types';
import { fetchFromApi, fetchWithAuth, generateStorageKey, triggerGlobalError } from './api-client';
import { cacheManager } from './cache-manager';

async function handleFailure(error: unknown): Promise<void> {
  console.error('数据库操作失败 (favorites):', error);
  triggerGlobalError('数据库操作失败');
  try {
    const fresh = await fetchFromApi<Record<string, Favorite>>('/api/favorites');
    cacheManager.cacheFavorites(fresh);
    window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: fresh }));
  } catch (e) {
    console.error('刷新收藏缓存失败:', e);
  }
}

function syncInBackground(cached: Record<string, Favorite>): void {
  fetchFromApi<Record<string, Favorite>>('/api/favorites')
    .then((fresh) => {
      if (JSON.stringify(cached) !== JSON.stringify(fresh)) {
        cacheManager.cacheFavorites(fresh);
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: fresh }));
      }
    })
    .catch((err) => {
      console.warn('后台同步收藏失败:', err);
      triggerGlobalError('后台同步收藏失败');
    });
}

export async function getAllFavorites(): Promise<Record<string, Favorite>> {
  if (typeof window === 'undefined') return {};

  const cached = cacheManager.getCachedFavorites();
  if (cached) {
    syncInBackground(cached);
    return cached;
  }

  try {
    const fresh = await fetchFromApi<Record<string, Favorite>>('/api/favorites');
    cacheManager.cacheFavorites(fresh);
    return fresh;
  } catch (err) {
    console.error('获取收藏失败:', err);
    triggerGlobalError('获取收藏失败');
    return {};
  }
}

export async function isFavorited(source: string, id: string): Promise<boolean> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedFavorites();
  if (cached) {
    syncInBackground(cached);
    return !!cached[key];
  }

  try {
    const fresh = await fetchFromApi<Record<string, Favorite>>('/api/favorites');
    cacheManager.cacheFavorites(fresh);
    return !!fresh[key];
  } catch (err) {
    console.error('检查收藏状态失败:', err);
    triggerGlobalError('检查收藏状态失败');
    return false;
  }
}

export async function saveFavorite(source: string, id: string, favorite: Favorite): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedFavorites() || {};
  cached[key] = favorite;
  cacheManager.cacheFavorites(cached);
  window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: cached }));

  try {
    await fetchWithAuth('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, favorite }),
    });
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('保存收藏失败');
    throw err;
  }
}

export async function deleteFavorite(source: string, id: string): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedFavorites() || {};
  delete cached[key];
  cacheManager.cacheFavorites(cached);
  window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: cached }));

  try {
    await fetchWithAuth(`/api/favorites?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('删除收藏失败');
    throw err;
  }
}

export async function clearAllFavorites(): Promise<void> {
  cacheManager.cacheFavorites({});
  window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: {} }));

  try {
    await fetchWithAuth('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('清空收藏失败');
    throw err;
  }
}

