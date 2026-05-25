import { AnimatePresence, motion } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { PosterCard } from '@/components/media/PosterCard';
import { PosterGrid } from '@/components/media/PosterGrid';
import type { AggregatedItem } from '../lib/aggregate';

interface SearchResultsGridProps {
  items: AggregatedItem[];
  loading: boolean;
  query: string;
}

export function SearchResultsGrid({ items, loading, query }: SearchResultsGridProps) {
  if (items.length === 0 && !loading) {
    return (
      <div className="rounded-2xl border border-border bg-card py-20 text-center text-sm text-muted-foreground">
        未找到相关内容
      </div>
    );
  }

  if (items.length === 0 && loading) {
    return (
      <PosterGrid>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3]" />
        ))}
      </PosterGrid>
    );
  }

  return (
    <PosterGrid>
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const primary = item.group[0];
          return (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.25 }}
            >
              <PosterCard
                variant="search"
                title={item.title}
                poster={item.poster}
                year={item.year}
                source={primary.source}
                id={primary.id}
                sourceName={primary.source_name}
                sourceNames={item.group.map((g) => g.source_name)}
                episodes={primary.episodes?.length || 0}
                doubanId={item.douban_id}
                candidates={item.group.length > 1 ? item.group : undefined}
                query={query}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </PosterGrid>
  );
}
