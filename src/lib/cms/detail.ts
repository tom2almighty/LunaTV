/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiFetch } from '../api-client';
import type { SearchResult } from '../types';

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
  const data = await resp.json().catch(() => null) as { error?: string } | null;
  if (!resp.ok) throw new Error(data?.error || fallbackMessage);
  return data as T;
}

export async function createPlaySession(payload: any): Promise<PlaySessionResponse> {
  const resp = await apiFetch('/api/play-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<PlaySessionResponse>(resp, '加载播放源失败');
}

export async function fetchSourceDetail(source: string, id: string): Promise<SearchResult> {
  const resp = await apiFetch(`/api/detail?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`);
  return parseJsonOrThrow<SearchResult>(resp, '获取详情失败');
}
