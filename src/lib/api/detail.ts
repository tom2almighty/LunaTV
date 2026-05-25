import type { SearchResult } from '@/lib/types';
import { apiFetch } from './client';

export type PlaySessionResponse = {
  detail: SearchResult;
  available_sources: SearchResult[];
  search_title: string;
  current_source: string;
  current_id: string;
  title: string;
  year: string;
  type: 'movie' | 'tv';
};

async function parseJsonOrThrow<T>(resp: Response, fallbackMessage: string): Promise<T> {
  const data = (await resp.json().catch(() => null)) as { error?: string } | null;
  if (!resp.ok) throw new Error(data?.error || fallbackMessage);
  return data as T;
}

export type PlaySessionMode = 'direct' | 'group' | 'search';

export interface PlaySessionPayload {
  mode: PlaySessionMode;
  source?: string;
  id?: string;
  title?: string;
  year?: string;
  poster?: string;
  source_name?: string;
  type?: 'movie' | 'tv';
  query?: string;
  preferredSource?: string;
  preferredId?: string;
  candidates?: SearchResult[];
  keyword?: string;
  expectedTitle?: string;
  expectedYear?: string;
}

export async function createPlaySession(
  payload: PlaySessionPayload,
  signal?: AbortSignal,
): Promise<PlaySessionResponse> {
  const resp = await apiFetch('/api/play-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return parseJsonOrThrow<PlaySessionResponse>(resp, '加载播放源失败');
}

export async function fetchSourceDetail(
  source: string,
  id: string,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const resp = await apiFetch(
    `/api/detail?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`,
    { signal },
  );
  return parseJsonOrThrow<SearchResult>(resp, '获取详情失败');
}
