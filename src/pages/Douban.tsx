import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RecommendationItem } from '../lib/types';
import VideoCard from '../components/VideoCard';

interface DoubanResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: { large: string; normal: string };
    rating: { value: number };
  }>;
}

async function fetchCategory(kind: string, category: string, type: string, start: number): Promise<{ items: RecommendationItem[]; total: number }> {
  const resp = await fetch(
    `/api/douban/rexxar/api/v2/subject/recent_hot/${kind}?start=${start}&limit=18&category=${category}&type=${type}`,
  );
  const data: DoubanResponse = await resp.json();
  return {
    total: data.total,
    items: data.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rating: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
      externalUrl: `https://movie.douban.com/subject/${item.id}`,
    })),
  };
}

const CONFIG: Record<string, { label: string; kind: string; category: string; type: string }> = {
  movie: { label: '电影', kind: 'movie', category: '热门', type: '全部' },
  tv: { label: '剧集', kind: 'tv', category: 'tv', type: 'tv' },
  show: { label: '综艺', kind: 'tv', category: 'show', type: 'show' },
};

export default function Douban() {
  const [searchParams] = useSearchParams();
  const typeKey = (searchParams.get('type') || 'movie') as keyof typeof CONFIG;
  const cfg = CONFIG[typeKey] || CONFIG.movie;
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (start: number) => {
    if (loading || done) return;
    setLoading(true);
    try {
      const data = await fetchCategory(cfg.kind, cfg.category, cfg.type, start);
      setItems((prev) => [...prev, ...data.items]);
      if (data.items.length < 18) setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, done, cfg.kind, cfg.category, cfg.type]);

  useEffect(() => {
    setItems([]);
    setDone(false);
  }, [typeKey]);

  useEffect(() => {
    if (items.length === 0 && !done) loadMore(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, typeKey]);

  useEffect(() => {
    if (!loaderRef.current || done) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && items.length > 0) {
          loadMore(items.length);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [items.length, loading, done, loadMore]);

  return (
    <div className="app-page animate-fade-up">
      <h1 className="mb-6 text-xl font-semibold text-[--color-foreground]">{cfg.label}</h1>

      <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-5 sm:gap-y-10">
        {items.map((item, i) => (
          <VideoCard
            key={`${item.id}-${i}`}
            from="douban"
            title={item.title}
            poster={item.poster}
            douban_id={Number(item.id)}
            rate={item.rating}
            year={item.year}
            type={typeKey}
          />
        ))}
      </div>

      <div ref={loaderRef} className="py-10 text-center">
        {loading && (
          <div className="inline-flex items-center gap-2 text-sm text-[--color-muted-foreground]">
            <div className="spinner" />
            加载中
          </div>
        )}
        {done && items.length > 0 && (
          <span className="text-sm text-[--color-muted-foreground]">— 已加载完毕 —</span>
        )}
      </div>
    </div>
  );
}
