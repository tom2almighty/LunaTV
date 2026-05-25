import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { deleteSearchHistory } from '@/lib/db';

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: (value: string) => void;
}

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const { data: history = [] } = useSearchHistory();

  // Close popover after submission
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setOpen(false);
    onSubmit(trimmed);
  };

  const showSuggestions = open && history.length > 0;

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <Popover open={showSuggestions} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="搜索电影、剧集、综艺..."
              autoComplete="off"
              autoFocus
              className="h-12 pl-10 pr-12 text-sm"
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                aria-label="清空"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn('w-[var(--radix-popover-trigger-width)] p-1')}
        >
          <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            搜索历史
          </div>
          <div className="max-h-72 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item}
                className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  onClick={() => {
                    onChange(item);
                    onSubmit(item);
                    setOpen(false);
                  }}
                >
                  {item}
                </button>
                <button
                  type="button"
                  className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSearchHistory(item);
                  }}
                  aria-label="删除"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </form>
  );
}
