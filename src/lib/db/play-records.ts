/* eslint-disable no-console */
'use client';

import { PlayRecord } from '../types';
import { fetchFromApi, fetchWithAuth, generateStorageKey, triggerGlobalError } from './api-client';
import { cacheManager } from './cache-manager';

async function handleFailure(error: unknown): Promise<void> {
  console.error('数据库操作失败 (playRecords):', error);
  triggerGlobalError('数据库操作失败');
  try {
    const fresh = await fetchFromApi<Record<string, PlayRecord>>('/api/playrecords');
    cacheManager.cachePlayRecords(fresh);
    window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: fresh }));
  } catch (e) {
    console.error('刷新播放记录缓存失败:', e);
  }
}

export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  if (typeof window === 'undefined') return {};

  const cached = cacheManager.getCachedPlayRecords();
  if (cached) {
    fetchFromApi<Record<string, PlayRecord>>('/api/playrecords')
      .then((fresh) => {
        if (JSON.stringify(cached) !== JSON.stringify(fresh)) {
          cacheManager.cachePlayRecords(fresh);
          window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: fresh }));
        }
      })
      .catch((err) => {
        console.warn('后台同步播放记录失败:', err);
        triggerGlobalError('后台同步播放记录失败');
      });
    return cached;
  }

  try {
    const fresh = await fetchFromApi<Record<string, PlayRecord>>('/api/playrecords');
    cacheManager.cachePlayRecords(fresh);
    return fresh;
  } catch (err) {
    console.error('获取播放记录失败:', err);
    triggerGlobalError('获取播放记录失败');
    return {};
  }
}

export async function savePlayRecord(source: string, id: string, record: PlayRecord): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  cached[key] = record;
  cacheManager.cachePlayRecords(cached);
  window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: cached }));

  try {
    await fetchWithAuth('/api/playrecords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, record }),
    });
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('保存播放记录失败');
    throw err;
  }
}

export async function deletePlayRecord(source: string, id: string): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  delete cached[key];
  cacheManager.cachePlayRecords(cached);
  window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: cached }));

  try {
    await fetchWithAuth(`/api/playrecords?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('删除播放记录失败');
    throw err;
  }
}

export async function clearAllPlayRecords(): Promise<void> {
  cacheManager.cachePlayRecords({});
  window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: {} }));

  try {
    await fetchWithAuth('/api/playrecords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('清空播放记录失败');
    throw err;
  }
}

