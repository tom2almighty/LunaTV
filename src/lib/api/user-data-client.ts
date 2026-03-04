'use client';

import { requestJson, requestJsonDelete, requestJsonPost } from './client';
import { Favorite, PlayRecord, SkipConfig } from '../types';

export function getFavoritesFromApi(): Promise<Record<string, Favorite>> {
  return requestJson<Record<string, Favorite>>('/api/user/favorites');
}

export function saveFavoriteToApi(
  source: string,
  videoId: string,
  favorite: Favorite,
): Promise<{ success: boolean }> {
  return requestJsonPost<{ success: boolean }, unknown>('/api/user/favorites', {
    source,
    videoId,
    favorite,
  });
}

export function deleteFavoriteFromApi(
  source: string,
  videoId: string,
): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>(
    `/api/user/favorites/${encodeURIComponent(source)}/${encodeURIComponent(videoId)}`,
  );
}

export function clearFavoritesFromApi(): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>('/api/user/favorites');
}

export function getPlayRecordsFromApi(): Promise<Record<string, PlayRecord>> {
  return requestJson<Record<string, PlayRecord>>('/api/user/play-records');
}

export function savePlayRecordToApi(
  source: string,
  videoId: string,
  record: PlayRecord,
): Promise<{ success: boolean }> {
  return requestJsonPost<{ success: boolean }, unknown>(
    '/api/user/play-records',
    {
      source,
      videoId,
      record,
    },
  );
}

export function deletePlayRecordFromApi(
  source: string,
  videoId: string,
): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>(
    `/api/user/play-records/${encodeURIComponent(source)}/${encodeURIComponent(videoId)}`,
  );
}

export function clearPlayRecordsFromApi(): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>('/api/user/play-records');
}

export function getSearchHistoryFromApi(): Promise<string[]> {
  return requestJson<string[]>('/api/user/search-history');
}

export function addSearchHistoryToApi(keyword: string): Promise<string[]> {
  return requestJsonPost<string[], { keyword: string }>(
    '/api/user/search-history',
    { keyword },
  );
}

export function deleteSearchHistoryItemFromApi(
  keyword: string,
): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>(
    `/api/user/search-history/${encodeURIComponent(keyword)}`,
  );
}

export function clearSearchHistoryFromApi(): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>('/api/user/search-history');
}

export function getSkipConfigsFromApi(): Promise<Record<string, SkipConfig>> {
  return requestJson<Record<string, SkipConfig>>('/api/user/skip-configs');
}

export function saveSkipConfigToApi(
  source: string,
  videoId: string,
  config: SkipConfig,
): Promise<{ success: boolean }> {
  return requestJsonPost<{ success: boolean }, unknown>(
    '/api/user/skip-configs',
    {
      source,
      videoId,
      config,
    },
  );
}

export function deleteSkipConfigFromApi(
  source: string,
  videoId: string,
): Promise<{ success: boolean }> {
  return requestJsonDelete<{ success: boolean }>(
    `/api/user/skip-configs/${encodeURIComponent(source)}/${encodeURIComponent(videoId)}`,
  );
}
