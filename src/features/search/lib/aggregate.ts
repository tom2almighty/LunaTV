import type { SearchResult } from '@/lib/types';

export interface AggregatedItem {
  key: string;
  title: string;
  poster: string;
  year: string;
  type: 'movie' | 'tv';
  douban_id: number;
  group: SearchResult[];
}

export function aggregateResults(items: SearchResult[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();
  for (const item of items) {
    const titleKey = item.title.trim().toLowerCase();
    const yearKey = item.year && item.year !== 'unknown' ? item.year : '';
    const key = `${titleKey}|${yearKey}`;
    const existing = map.get(key);
    if (existing) {
      existing.group.push(item);
      if (!existing.poster && item.poster) existing.poster = item.poster;
    } else {
      map.set(key, {
        key,
        title: item.title,
        poster: item.poster,
        year: item.year,
        type: item.episodes && item.episodes.length === 1 ? 'movie' : 'tv',
        douban_id: item.douban_id || 0,
        group: [item],
      });
    }
  }
  return Array.from(map.values());
}
