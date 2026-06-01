import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SourceLike {
  source: string;
  source_name: string;
  id: string;
}

interface PlaybackPanelProps {
  totalEpisodes: number;
  episodesTitles: string[];
  episodeValue: number; // 1-based
  onEpisodeChange: (ep: number) => void;
  currentSource: string;
  currentId: string;
  availableSources: SourceLike[];
  onSourceChange: (source: string, id: string, title: string) => Promise<void>;
}

export function PlaybackPanel({
  totalEpisodes,
  episodesTitles,
  episodeValue,
  onEpisodeChange,
  currentSource,
  currentId,
  availableSources,
  onSourceChange,
}: PlaybackPanelProps) {
  const currentKey = `${currentSource}+${currentId}`;
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Clear pending state once parent's current source/id catches up
  useEffect(() => {
    if (pendingKey && pendingKey === currentKey) setPendingKey(null);
  }, [pendingKey, currentKey]);

  const activeKey = pendingKey ?? currentKey;

  const handleSourceClick = async (src: SourceLike) => {
    const key = `${src.source}+${src.id}`;
    if (key === currentKey) return;
    setPendingKey(key);
    try {
      await onSourceChange(src.source, src.id, src.source_name);
    } catch {
      setPendingKey(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Tabs defaultValue="episodes" className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border p-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="episodes">
              选集{totalEpisodes > 0 && ` (${totalEpisodes})`}
            </TabsTrigger>
            <TabsTrigger value="sources">
              换源{availableSources.length > 0 && ` (${availableSources.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="episodes" className="m-0 flex-1 overflow-hidden">
          {totalEpisodes > 0 ? (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-5 gap-1.5 p-3 sm:grid-cols-6 lg:grid-cols-5">
                {Array.from({ length: totalEpisodes }, (_, i) => {
                  const active = episodeValue === i + 1;
                  const label = episodesTitles[i] || `${i + 1}`;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onEpisodeChange(i + 1)}
                      title={label}
                      data-active={active}
                      className={cn(
                        'flex h-9 min-w-0 items-center justify-center rounded-md border border-transparent px-1',
                        'cursor-pointer text-xs font-medium tabular-nums transition-colors',
                        'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        'data-[active=true]:border-primary/30 data-[active=true]:bg-primary/15 data-[active=true]:text-foreground',
                      )}
                    >
                      <span className="block truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">暂无选集</div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="m-0 flex-1 overflow-hidden">
          {availableSources.length > 0 ? (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-3">
                {availableSources.map((src) => {
                  const key = `${src.source}+${src.id}`;
                  const isActive = activeKey === key;
                  const isLoading = pendingKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSourceClick(src)}
                      disabled={isLoading}
                      title={src.source_name}
                      data-active={isActive}
                      className={cn(
                        'flex h-10 min-w-0 items-center justify-center rounded-md border border-transparent px-2',
                        'cursor-pointer text-xs font-medium transition-colors disabled:cursor-wait',
                        'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        'data-[active=true]:border-primary/30 data-[active=true]:bg-primary/15 data-[active=true]:text-foreground',
                      )}
                    >
                      {isLoading ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                      ) : (
                        <span className="block truncate">{src.source_name}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              无其他可用源
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
