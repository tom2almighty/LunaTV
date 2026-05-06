/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SearchResult } from '../types';
import { ensureSourcesLoaded, getCmsClient, getCmsSources } from './client';

function mapItem(item: any): SearchResult {
  return {
    id: String(item.vod_id || ''), title: String(item.vod_name || ''),
    poster: String(item.vod_pic || ''), source: String(item.source_code || ''),
    source_name: String(item.source_name || ''), year: String(item.vod_year || 'unknown'),
    episodes: [], episodes_titles: [], class: '', desc: String(item.vod_content || ''),
    type_name: String(item.type_name || ''),
    douban_id: item.vod_douban_score ? Number(item.vod_douban_score) : 0,
    score: item.vod_douban_score ? String(item.vod_douban_score) : '',
    actors: String(item.vod_actor || ''), directors: String(item.vod_director || ''),
    area: String(item.vod_area || ''), lang: '', remark: String(item.vod_remarks || ''),
  };
}

export async function searchAllSources(query: string): Promise<SearchResult[]> {
  if (!query) return [];
  await ensureSourcesLoaded();
  const cms = getCmsClient();
  const sources = getCmsSources().filter((s) => s.isEnabled);
  if (sources.length === 0) return [];
  const items = await cms.aggregatedSearch(query, sources, 1);
  return items.map(mapItem);
}

export interface SearchStreamCallbacks {
  onStart(totalSources: number): void;
  onResult(items: SearchResult[], sourceKey: string, sourceName: string): void;
  onProgress(completed: number, total: number): void;
  onComplete(totalResults: number, completedSources: number): void;
}

export async function searchStream(query: string, cb: SearchStreamCallbacks): Promise<void> {
  await ensureSourcesLoaded();
  const cms = getCmsClient();
  const sources = getCmsSources().filter((s) => s.isEnabled);
  if (sources.length === 0) { cb.onComplete(0, 0); return; }

  cb.onStart(sources.length);
  const all: SearchResult[] = [];

  const unsubResult = cms.on('search:result', (e) => {
    const items = e.items.map(mapItem); all.push(...items);
    cb.onResult(items, e.source?.id || '', e.source?.name || '');
  });
  const unsubProgress = cms.on('search:progress', (e) => {
    cb.onProgress(e.completed, e.total);
  });

  try {
    await cms.aggregatedSearch(query, sources, 1);
  } finally {
    unsubResult(); unsubProgress();
  }
  cb.onComplete(all.length, sources.length);
}
