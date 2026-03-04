/* eslint-disable no-console */
'use client';

import { generateStorageKey, triggerGlobalError } from './api-client';
import { cacheManager } from './cache-manager';
import {
  clearPlayRecordsFromApi,
  deletePlayRecordFromApi,
  getPlayRecordsFromApi,
  savePlayRecordToApi,
} from '../api/user-data-client';
import { PlayRecord } from '../types';

async function handleFailure(error: unknown): Promise<void> {
  console.error('数据库操作失败 (playRecords):', error);
  triggerGlobalError('数据库操作失败');
  try {
    const fresh = await getPlayRecordsFromApi();
    cacheManager.cachePlayRecords(fresh);
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', { detail: fresh }),
    );
  } catch (e) {
    console.error('刷新播放记录缓存失败:', e);
  }
}

export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  if (typeof window === 'undefined') return {};

  const cached = cacheManager.getCachedPlayRecords();
  if (cached) {
    getPlayRecordsFromApi()
      .then((fresh) => {
        if (JSON.stringify(cached) !== JSON.stringify(fresh)) {
          cacheManager.cachePlayRecords(fresh);
          window.dispatchEvent(
            new CustomEvent('playRecordsUpdated', { detail: fresh }),
          );
        }
      })
      .catch((err) => {
        console.warn('后台同步播放记录失败:', err);
        triggerGlobalError('后台同步播放记录失败');
      });
    return cached;
  }

  try {
    const fresh = await getPlayRecordsFromApi();
    cacheManager.cachePlayRecords(fresh);
    return fresh;
  } catch (err) {
    console.error('获取播放记录失败:', err);
    triggerGlobalError('获取播放记录失败');
    return {};
  }
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
  window.dispatchEvent(
    new CustomEvent('playRecordsUpdated', { detail: cached }),
  );

  try {
    await savePlayRecordToApi(source, id, record);
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('保存播放记录失败');
    throw err;
  }
}

export async function deletePlayRecord(
  source: string,
  id: string,
): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedPlayRecords() || {};
  delete cached[key];
  cacheManager.cachePlayRecords(cached);
  window.dispatchEvent(
    new CustomEvent('playRecordsUpdated', { detail: cached }),
  );

  try {
    await deletePlayRecordFromApi(source, id);
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
    await clearPlayRecordsFromApi();
  } catch (err) {
    await handleFailure(err);
    triggerGlobalError('清空播放记录失败');
    throw err;
  }
}
