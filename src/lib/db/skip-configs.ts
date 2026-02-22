/* eslint-disable no-console */
'use client';

import {
  fetchFromApi,
  fetchWithAuth,
  generateStorageKey,
  triggerGlobalError,
} from './api-client';
import { cacheManager } from './cache-manager';
import { SkipConfig } from '../types';

function syncInBackground(cached: Record<string, SkipConfig>): void {
  fetchFromApi<Record<string, SkipConfig>>('/api/skipconfigs')
    .then((fresh) => {
      if (JSON.stringify(cached) !== JSON.stringify(fresh)) {
        cacheManager.cacheSkipConfigs(fresh);
        window.dispatchEvent(
          new CustomEvent('skipConfigsUpdated', { detail: fresh }),
        );
      }
    })
    .catch((err) => console.warn('后台同步跳过片头片尾配置失败:', err));
}

export async function getSkipConfig(
  source: string,
  id: string,
): Promise<SkipConfig | null> {
  if (typeof window === 'undefined') return null;
  const key = generateStorageKey(source, id);

  const cached = cacheManager.getCachedSkipConfigs();
  if (cached) {
    syncInBackground(cached);
    return cached[key] || null;
  }

  try {
    const fresh =
      await fetchFromApi<Record<string, SkipConfig>>('/api/skipconfigs');
    cacheManager.cacheSkipConfigs(fresh);
    return fresh[key] || null;
  } catch (err) {
    console.error('获取跳过片头片尾配置失败:', err);
    triggerGlobalError('获取跳过片头片尾配置失败');
    return null;
  }
}

export async function getAllSkipConfigs(): Promise<Record<string, SkipConfig>> {
  if (typeof window === 'undefined') return {};

  const cached = cacheManager.getCachedSkipConfigs();
  if (cached) {
    syncInBackground(cached);
    return cached;
  }

  try {
    const fresh =
      await fetchFromApi<Record<string, SkipConfig>>('/api/skipconfigs');
    cacheManager.cacheSkipConfigs(fresh);
    return fresh;
  } catch (err) {
    console.error('获取跳过片头片尾配置失败:', err);
    triggerGlobalError('获取跳过片头片尾配置失败');
    return {};
  }
}

export async function saveSkipConfig(
  source: string,
  id: string,
  config: SkipConfig,
): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedSkipConfigs() || {};
  cached[key] = config;
  cacheManager.cacheSkipConfigs(cached);
  window.dispatchEvent(
    new CustomEvent('skipConfigsUpdated', { detail: cached }),
  );

  try {
    await fetchWithAuth('/api/skipconfigs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, config }),
    });
  } catch (err) {
    console.error('保存跳过片头片尾配置失败:', err);
    triggerGlobalError('保存跳过片头片尾配置失败');
  }
}

export async function deleteSkipConfig(
  source: string,
  id: string,
): Promise<void> {
  const key = generateStorageKey(source, id);
  const cached = cacheManager.getCachedSkipConfigs() || {};
  delete cached[key];
  cacheManager.cacheSkipConfigs(cached);
  window.dispatchEvent(
    new CustomEvent('skipConfigsUpdated', { detail: cached }),
  );

  try {
    await fetchWithAuth(`/api/skipconfigs?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('删除跳过片头片尾配置失败:', err);
    triggerGlobalError('删除跳过片头片尾配置失败');
  }
}
