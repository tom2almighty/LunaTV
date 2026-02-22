/* eslint-disable no-console */
'use client';

import { fetchFromApi, fetchWithAuth, triggerGlobalError } from './api-client';
import { cacheManager } from './cache-manager';

const SEARCH_HISTORY_LIMIT = 20;

async function handleFailure(error: unknown): Promise<void> {
  console.error('数据库操作失败 (searchHistory):', error);
  try {
    const fresh = await fetchFromApi<string[]>('/api/searchhistory');
    cacheManager.cacheSearchHistory(fresh);
    window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: fresh }));
  } catch (e) {
    console.error('刷新搜索历史缓存失败:', e);
  }
}

export async function getSearchHistory(): Promise<string[]> {
  if (typeof window === 'undefined') return [];

  const cached = cacheManager.getCachedSearchHistory();
  if (cached) {
    fetchFromApi<string[]>('/api/searchhistory')
      .then((fresh) => {
        if (JSON.stringify(cached) !== JSON.stringify(fresh)) {
          cacheManager.cacheSearchHistory(fresh);
          window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: fresh }));
        }
      })
      .catch((err) => {
        console.warn('后台同步搜索历史失败:', err);
        triggerGlobalError('后台同步搜索历史失败');
      });
    return cached;
  }

  try {
    const fresh = await fetchFromApi<string[]>('/api/searchhistory');
    cacheManager.cacheSearchHistory(fresh);
    return fresh;
  } catch (err) {
    console.error('获取搜索历史失败:', err);
    triggerGlobalError('获取搜索历史失败');
    return [];
  }
}

export async function addSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  const history = cacheManager.getCachedSearchHistory() || [];
  const next = [trimmed, ...history.filter((k) => k !== trimmed)].slice(0, SEARCH_HISTORY_LIMIT);
  cacheManager.cacheSearchHistory(next);
  window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: next }));

  try {
    await fetchWithAuth('/api/searchhistory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: trimmed }),
    });
  } catch (err) {
    await handleFailure(err);
  }
}

export async function deleteSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  const next = (cacheManager.getCachedSearchHistory() || []).filter((k) => k !== trimmed);
  cacheManager.cacheSearchHistory(next);
  window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: next }));

  try {
    await fetchWithAuth(`/api/searchhistory?keyword=${encodeURIComponent(trimmed)}`, { method: 'DELETE' });
  } catch (err) {
    await handleFailure(err);
  }
}

export async function clearSearchHistory(): Promise<void> {
  cacheManager.cacheSearchHistory([]);
  window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: [] }));

  try {
    await fetchWithAuth('/api/searchhistory', { method: 'DELETE' });
  } catch (err) {
    await handleFailure(err);
  }
}

