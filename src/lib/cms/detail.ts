/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SearchResult } from '../types';
import { searchAllSources } from './search';
import { ensureSourcesLoaded, getCmsClient, getCmsSources } from './client';

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

function normalizeYear(year?: string): string {
  if (!year) return 'unknown';
  const matched = year.match(/\d{4}/)?.[0];
  return matched || 'unknown';
}

async function fetchDetailFromCms(source: string, id: string): Promise<SearchResult | null> {
  await ensureSourcesLoaded();
  const cms = getCmsClient();
  const src = getCmsSources().find((s) => s.id === source);
  if (!src) return null;

  try {
    const detail = await cms.getDetail(id, src);
    if (!detail.success) return null;

    return {
      id,
      title: detail.videoInfo?.title || '',
      poster: detail.videoInfo?.cover || '',
      source,
      source_name: detail.videoInfo?.source_name || src.name,
      episodes: detail.episodes || [],
      episodes_titles: detail.videoInfo?.episodes_names || [],
      year: detail.videoInfo?.year || 'unknown',
      desc: detail.videoInfo?.desc || '',
      type_name: detail.videoInfo?.type || '',
      area: detail.videoInfo?.area || '',
      actors: detail.videoInfo?.actor || '',
      directors: detail.videoInfo?.director || '',
      douban_id: 0,
      score: '',
      class: '',
      lang: '',
      remark: detail.videoInfo?.remarks || '',
    };
  } catch {
    return null;
  }
}

export async function createPlaySession(payload: any): Promise<PlaySessionResponse> {
  await ensureSourcesLoaded();

  const mode = String(payload.mode || '');
  let candidates: SearchResult[];
  const query = String(payload.query || '').trim();

  if (mode === 'group') {
    if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) {
      throw new Error('缺少候选播放源');
    }
    candidates = payload.candidates.filter((item: any) => item.source && item.id);
  } else if (mode === 'direct') {
    const source = String(payload.source || '');
    const id = String(payload.id || '');
    if (!source || !id) throw new Error('缺少 source 或 id');

    const src = getCmsSources().find((s) => s.id === source);
    candidates = [{
      id,
      title: String(payload.title || ''),
      poster: String(payload.poster || ''),
      source,
      source_name: String(payload.source_name || src?.name || source),
      episodes: [],
      episodes_titles: [],
      year: normalizeYear(String(payload.year || 'unknown')),
      desc: '', type_name: '', douban_id: 0, score: '', class: '',
      actors: '', directors: '', area: '', lang: '', remark: '',
    }];
  } else if (mode === 'search') {
    const keyword = String(payload.keyword || '').trim();
    if (!keyword) throw new Error('缺少搜索关键词');
    candidates = await searchAllSources(keyword);
    if (candidates.length === 0) throw new Error('未找到匹配播放源');
  } else {
    throw new Error('无效的模式');
  }

  const preferredSource = payload.preferredSource ? String(payload.preferredSource) : undefined;
  const preferredId = payload.preferredId ? String(payload.preferredId) : undefined;

  let currentSource: string;
  let currentId: string;

  if (preferredSource && preferredId) {
    currentSource = preferredSource;
    currentId = preferredId;
  } else {
    currentSource = candidates[0].source;
    currentId = candidates[0].id;
  }

  let detail = await fetchDetailFromCms(currentSource, currentId);
  if (!detail) {
    detail = candidates.find((c) => c.source === currentSource && c.id === currentId) || candidates[0];
  }

  const title = String(payload.title || detail.title || candidates[0]?.title || '').trim();
  const year = normalizeYear(String(payload.year || detail.year || 'unknown'));
  const type = (detail.episodes.length > 1 ? 'tv' : 'movie') as PlaySessionResponse['type'];

  return {
    detail,
    available_sources: candidates,
    search_title: query,
    current_source: currentSource,
    current_id: currentId,
    title,
    year,
    type,
  };
}

export async function fetchSourceDetail(source: string, id: string): Promise<SearchResult> {
  const detail = await fetchDetailFromCms(source, id);
  if (!detail) throw new Error('获取详情失败');
  return detail;
}
