import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import {
  clearAllPlayRecords,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '../lib/db';
import { fetchRecommendations, getCachedRecommendations, setCachedRecommendations } from '../lib/recommendations';
import type { PlayRecord, RecommendationItem } from '../lib/types';
import VideoCard from '../components/VideoCard';
import ScrollableRow from '../components/ScrollableRow';

interface HistoryItem extends PlayRecord {
  key: string;
  source: string;
  id: string;
  progressPct: number;
}

function buildHistory(records: Record<string, PlayRecord>): HistoryItem[] {
  return Object.entries(records)
    .map(([key, rec]) => {
      const [source, id] = key.split('+');
      const progressPct = rec.total_time > 0
        ? Math.min(100, (rec.play_time / rec.total_time) * 100)
        : 0;
      return { ...rec, key, source, id, progressPct };
    })
    .sort((a, b) => b.save_time - a.save_time);
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'history' ? 'history' : 'home') as 'home' | 'history';
  const [tab, setTab] = useState<'home' | 'history'>(initialTab);
  const [movies, setMovies] = useState<RecommendationItem[]>([]);
  const [tvShows, setTvShows] = useState<RecommendationItem[]>([]);
  const [varietyShows, setVarietyShows] = useState<RecommendationItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const cached = getCachedRecommendations();
    if (cached) { setMovies(cached.movies); setTvShows(cached.tvShows); setVarietyShows(cached.varietyShows); }
    fetchRecommendations().then((data) => {
      setMovies(data.movies); setTvShows(data.tvShows); setVarietyShows(data.varietyShows);
      if (!cached) setCachedRecommendations(data);
    });
  }, []);

  useEffect(() => {
    if (tab !== 'history') return;
    const load = async () => {
      const records = await getAllPlayRecords();
      setHistory(buildHistory(records));
    };
    load();
    return subscribeToDataUpdates<Record<string, PlayRecord>>('playRecordsUpdated', (records) => {
      setHistory(buildHistory(records));
    });
  }, [tab]);

  const handleTabChange = (next: 'home' | 'history') => {
    setTab(next);
    if (next === 'history') setSearchParams({ tab: 'history' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const Row = ({ items, type }: { items: RecommendationItem[]; type?: string }) => (
    <ScrollableRow>
      {items.map((item, i) => (
        <div key={`${item.id}-${i}`} className="w-32 shrink-0 sm:w-40 md:w-44">
          <VideoCard from="douban" title={item.title} poster={item.poster} douban_id={Number(item.id)} rate={item.rating} year={item.year} type={type} />
        </div>
      ))}
    </ScrollableRow>
  );

  const sections = [
    { label: '热门电影', items: movies, type: 'movie' },
    { label: '热门剧集', items: tvShows, type: 'tv' },
    { label: '热门综艺', items: varietyShows, type: 'show' },
  ];

  return (
    <div className="app-page animate-fade-in">
      {/* Tabs */}
      <div className="mb-8 flex items-center gap-1">
        {(['home', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-[background-color,color] ${
              tab === t
                ? 'bg-[--color-accent-tint] text-[--color-foreground]'
                : 'text-[--color-muted-foreground] hover:bg-[--overlay-1] hover:text-[--color-foreground]'
            }`}
          >
            {t === 'history' && <Clock className="h-3.5 w-3.5" strokeWidth={2} />}
            {t === 'home' ? '推荐' : '历史记录'}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="section-heading">观看历史</h2>
            {history.length > 0 && (
              <button
                onClick={async () => { await clearAllPlayRecords(); setHistory([]); }}
                className="rounded-md px-2 py-1 text-sm text-[--color-muted-foreground] transition-[background-color,color] hover:bg-[--overlay-1] hover:text-[--color-accent-soft]"
              >
                清空
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="rounded-2xl surface py-20 text-center text-sm text-[--color-muted-foreground]">
              暂无观看历史
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-5 sm:gap-y-10">
              {history.map((item) => (
                <VideoCard
                  key={item.key}
                  from="playrecord"
                  id={item.id}
                  source={item.source}
                  title={item.title}
                  poster={item.cover}
                  episodes={item.total_episodes}
                  source_name={item.source_name}
                  currentEpisode={item.index + 1}
                  query={item.search_title}
                  year={item.year}
                  progress={item.progressPct}
                  type={item.total_episodes > 1 ? 'tv' : ''}
                  onDelete={() => setHistory((prev) => prev.filter((h) => h.key !== item.key))}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-10">
          {sections.map(({ label, items, type }) => (
            <section key={label}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-heading">{label}</h2>
                <Link
                  to={`/douban?type=${type || 'show'}`}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[--color-muted-foreground] transition-[background-color,color] hover:bg-[--overlay-1] hover:text-[--color-accent-soft]"
                >
                  更多 <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </div>
              {items.length === 0 ? (
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] w-32 shrink-0 animate-pulse rounded-xl bg-[--color-surface] sm:w-44" />
                  ))}
                </div>
              ) : (
                <Row items={items} type={type} />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
