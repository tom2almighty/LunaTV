import { Search as SearchIcon, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchStream } from '../lib/cms/search';
import { addSearchHistory, clearSearchHistory, deleteSearchHistory, getSearchHistory } from '../lib/db';
import type { SearchResult } from '../lib/types';
import VideoCard from '../components/VideoCard';

interface AggregatedItem {
  key: string;
  title: string;
  poster: string;
  year: string;
  type: 'movie' | 'tv';
  douban_id: number;
  group: SearchResult[];
}

function aggregateResults(items: SearchResult[]): AggregatedItem[] {
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

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastQueryRef = useRef<string>('');

  useEffect(() => { getSearchHistory().then(setHistory); }, []);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (lastQueryRef.current === trimmed && (loading || results.length > 0)) return;
    lastQueryRef.current = trimmed;

    setQuery(trimmed);
    setShowResults(true);
    setLoading(true);
    setResults([]);
    setTotalSources(0);
    setCompletedSources(0);
    addSearchHistory(trimmed);
    getSearchHistory().then(setHistory);

    await searchStream(trimmed, {
      onStart: (total) => setTotalSources(total),
      onResult: (items) => setResults((prev) => [...prev, ...items]),
      onProgress: (completed) => setCompletedSources(completed),
      onComplete: (_total, completed) => {
        setCompletedSources(completed);
        setLoading(false);
      },
    });
  }, [loading, results.length]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== lastQueryRef.current) doSearch(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchParams({ q: trimmed }, { replace: true });
  };

  const triggerSearch = (q: string) => {
    setQuery(q);
    setSearchParams({ q }, { replace: true });
  };

  const aggregated = useMemo(() => aggregateResults(results), [results]);
  const progressPct = totalSources > 0 ? Math.min(100, (completedSources / totalSources) * 100) : 0;

  return (
    <div className="app-page animate-fade-up">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted-foreground]" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索电影、剧集、综艺..."
            autoComplete="off"
            autoFocus
            className="input-clean h-12 w-full pl-11 pr-12 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[--color-muted-foreground] transition-colors hover:bg-[--overlay-1] hover:text-[--color-foreground] active:bg-[--overlay-2]"
              aria-label="清空"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </form>

      {showResults ? (
        <section>
          {/* Status row */}
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold text-[--color-foreground]">搜索结果</h2>
              <span className="text-sm text-[--color-muted-foreground]">
                {aggregated.length} 部
              </span>
            </div>
            {totalSources > 0 && (
              <div className="flex items-center gap-3">
                {loading && <div className="spinner" />}
                <span className="text-xs text-[--color-muted-foreground]">
                  {completedSources}/{totalSources} 源
                </span>
                <div className="h-1 w-24 overflow-hidden rounded-full bg-[--color-border]">
                  <div
                    className="h-full bg-[--color-accent] transition-all duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {aggregated.length === 0 && !loading && (
            <div className="rounded-2xl surface py-20 text-center text-sm text-[--color-muted-foreground]">
              未找到相关内容
            </div>
          )}

          {aggregated.length === 0 && loading && (
            <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-[--color-surface]" />
              ))}
            </div>
          )}

          {aggregated.length > 0 && (
            <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-5 sm:gap-y-10">
              {aggregated.map((item) => {
                const primary = item.group[0];
                return (
                  <VideoCard
                    key={item.key}
                    from="search"
                    id={primary.id}
                    title={item.title}
                    poster={item.poster}
                    source={primary.source}
                    source_name={primary.source_name}
                    source_names={item.group.map((g) => g.source_name)}
                    year={item.year}
                    episodes={primary.episodes?.length || 0}
                    douban_id={item.douban_id}
                    type={item.type}
                    isAggregate={item.group.length > 1}
                    play_group={item.group}
                    query={query}
                  />
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[--color-foreground]">搜索历史</h2>
            {history.length > 0 && (
              <button
                onClick={() => { clearSearchHistory(); setHistory([]); }}
                className="rounded-md px-2 py-1 text-sm text-[--color-muted-foreground] transition-[background-color,color] hover:bg-[--overlay-1] hover:text-[--color-destructive]"
              >
                清空
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="rounded-2xl surface py-12 text-center text-sm text-[--color-muted-foreground]">
              暂无搜索历史
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <div key={item} className="group relative">
                  <button
                    onClick={() => triggerSearch(item)}
                    className="cursor-pointer rounded-full border border-transparent bg-[--color-surface-2] px-4 py-1.5 text-sm text-[--color-foreground] transition-[background-color,border-color,color] hover:border-[rgba(229,9,20,0.22)] hover:bg-[--color-accent-tint] hover:text-[--color-accent-soft]"
                  >
                    {item}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSearchHistory(item); getSearchHistory().then(setHistory); }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[--color-surface-floating] text-[--color-muted-foreground] opacity-0 shadow transition-[background-color,color,opacity] hover:bg-[--color-accent] hover:text-white group-hover:opacity-100"
                    aria-label="删除"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
