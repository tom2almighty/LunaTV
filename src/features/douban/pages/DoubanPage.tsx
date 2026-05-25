import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import type { RecommendationItem } from '@/lib/types';
import { PosterCard } from '@/components/media/PosterCard';
import { PosterGrid } from '@/components/media/PosterGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryTabs, useDoubanType, type DoubanType } from '../components/CategoryTabs';
import { useDoubanCategory, type DoubanCategoryKey } from '../hooks/useDoubanCategory';

const CONFIG: Record<DoubanType, DoubanCategoryKey> = {
  movie: { kind: 'movie', category: '热门', type: '全部' },
  tv: { kind: 'tv', category: 'tv', type: 'tv' },
  show: { kind: 'tv', category: 'show', type: 'show' },
};

export default function DoubanPage() {
  const { value: type, setValue: setType } = useDoubanType();
  const loaderRef = useRef<HTMLDivElement>(null);

  const query = useDoubanCategory(CONFIG[type]);
  const items = useMemo<RecommendationItem[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  useEffect(() => {
    if (!loaderRef.current || !query.hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [query]);

  const isInitialLoading = query.isLoading;

  return (
    <div className="app-page">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">分类</h1>
        <CategoryTabs value={type} onChange={setType} />
      </div>

      {isInitialLoading ? (
        <PosterGrid>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </PosterGrid>
      ) : (
        <PosterGrid>
          {items.map((item, i) => (
            <motion.div
              key={`${item.id}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i % 18, 12) * 0.02, duration: 0.25 }}
            >
              <PosterCard
                variant="douban"
                title={item.title}
                poster={item.poster}
                year={item.year}
                rating={item.rating}
                doubanId={Number(item.id)}
                doubanType={type}
              />
            </motion.div>
          ))}
        </PosterGrid>
      )}

      <div ref={loaderRef} className="py-10 text-center">
        {query.isFetchingNextPage && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
            加载中
          </span>
        )}
        {!query.hasNextPage && items.length > 0 && (
          <span className="text-sm text-muted-foreground">— 已加载完毕 —</span>
        )}
      </div>
    </div>
  );
}
