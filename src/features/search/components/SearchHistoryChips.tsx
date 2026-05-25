import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearSearchHistory, deleteSearchHistory } from '@/lib/db';
import { useSearchHistory } from '../hooks/useSearchHistory';

interface SearchHistoryChipsProps {
  onPick: (keyword: string) => void;
}

export function SearchHistoryChips({ onPick }: SearchHistoryChipsProps) {
  const { data: history = [] } = useSearchHistory();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">搜索历史</h2>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearSearchHistory()}
            className="text-muted-foreground hover:text-destructive"
          >
            清空
          </Button>
        )}
      </div>
      {history.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          暂无搜索历史
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {history.map((item) => (
            <div key={item} className="group relative">
              <button
                onClick={() => onPick(item)}
                className="rounded-full border border-transparent bg-secondary px-4 py-1.5 text-sm transition-colors hover:border-primary/20 hover:bg-accent hover:text-primary"
              >
                {item}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSearchHistory(item);
                }}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-popover text-muted-foreground opacity-0 shadow transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                aria-label="删除"
              >
                <X className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
