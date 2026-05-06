import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PlaybackPanelProps {
  totalEpisodes: number;
  episodes_titles: string[];
  episodeValue: number;
  onEpisodeChange: (ep: number) => void;
  currentSource: string;
  currentId: string;
  videoTitle: string;
  availableSources: Array<{ source: string; source_name: string; id: string }>;
  onSourceChange: (source: string, id: string, title: string) => Promise<void>;
}

export default function PlaybackPanel({
  totalEpisodes, episodes_titles, episodeValue, onEpisodeChange,
  currentSource, currentId, videoTitle, availableSources, onSourceChange,
}: PlaybackPanelProps) {
  const [tab, setTab] = useState<'episodes' | 'sources'>('episodes');

  // Optimistic source selection: set on click, cleared once parent's
  // currentSource/currentId catches up (or the request fails).
  const currentKey = `${currentSource}+${currentId}`;
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (pendingKey && pendingKey === currentKey) setPendingKey(null);
  }, [pendingKey, currentKey]);

  // Visually-active key — pending overrides actual current while in flight
  const activeKey = pendingKey ?? currentKey;

  const handleSourceClick = async (src: { source: string; source_name: string; id: string }) => {
    const key = `${src.source}+${src.id}`;
    if (key === currentKey) return;
    setPendingKey(key);
    try {
      await onSourceChange(src.source, src.id, src.source_name || videoTitle);
    } catch {
      setPendingKey(null);
    }
  };

  return (
    <div className="surface-card flex h-full flex-col overflow-hidden rounded-2xl">
      {/* Tabs */}
      <div className="flex shrink-0 gap-1.5 p-2">
        <TabButton
          active={tab === 'episodes'}
          onClick={() => setTab('episodes')}
          label="选集"
          count={totalEpisodes}
        />
        <TabButton
          active={tab === 'sources'}
          onClick={() => setTab('sources')}
          label="换源"
          count={availableSources.length}
        />
      </div>

      <div className="mx-2 h-px shrink-0 bg-[--color-border]" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {tab === 'episodes' ? (
          totalEpisodes > 0 ? (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
              {Array.from({ length: totalEpisodes }, (_, i) => {
                const active = episodeValue === i + 1;
                const label = episodes_titles[i] || `${i + 1}`;
                return (
                  <button
                    key={i}
                    onClick={() => onEpisodeChange(i + 1)}
                    className={`flex h-9 cursor-pointer items-center justify-center rounded-md border px-1 text-xs font-medium transition-[background-color,border-color,box-shadow,color,transform] duration-200 active:translate-y-px ${
                      active
                        ? 'border-[--color-control-border-active] bg-[--color-accent-tint] text-[--color-foreground] shadow-[0_0_12px_-4px_rgba(229,9,20,0.28)]'
                        : 'border-transparent bg-[--color-surface-2] text-[--color-muted-foreground] hover:border-[--color-control-border-hover] hover:bg-[--color-surface-hover] hover:text-[--color-foreground]'
                    }`}
                    style={{ transitionTimingFunction: 'var(--ease-soft)' }}
                    title={label}
                  >
                    <span className="block truncate tabular-nums">{label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState text="暂无选集" />
          )
        ) : availableSources.length > 0 ? (
          <div className="space-y-0.5">
            {availableSources.map((src) => {
              const key = `${src.source}+${src.id}`;
              const isActive = activeKey === key;
              const isLoading = pendingKey === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSourceClick(src)}
                  disabled={isLoading}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-[background-color,border-color,box-shadow,color] duration-200 disabled:cursor-wait ${
                    isActive
                      ? 'border-[--color-control-border-active] bg-[--color-accent-tint] text-[--color-foreground] shadow-[0_0_12px_-4px_rgba(229,9,20,0.2)]'
                      : 'border-transparent text-[--color-muted-foreground] hover:border-[--color-control-border-hover] hover:bg-[--color-surface-hover] hover:text-[--color-foreground]'
                  }`}
                  style={{ transitionTimingFunction: 'var(--ease-soft)' }}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ${
                      isActive ? 'bg-[--color-accent]' : 'bg-[--color-subtle-foreground]'
                    }`}
                  />
                  <span className="flex-1 truncate">{src.source_name}</span>
                  {isLoading ? (
                    <span className="row-spinner shrink-0" aria-label="加载中" />
                  ) : isActive ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[--color-accent]" strokeWidth={2.5} />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState text="无其他可用源" />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 cursor-pointer rounded-md border py-2.5 text-sm transition-[background-color,border-color,box-shadow,color] duration-200 ${
        active
          ? 'border-[--color-control-border-active] bg-[--color-accent-tint] font-semibold text-[--color-foreground] shadow-[0_0_12px_-4px_rgba(229,9,20,0.22)]'
          : 'border-transparent font-medium text-[--color-muted-foreground] hover:border-[--color-control-border-hover] hover:bg-[--color-surface-hover] hover:text-[--color-foreground]'
      }`}
      style={{ transitionTimingFunction: 'var(--ease-soft)' }}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={`ml-1.5 inline-flex min-w-5 items-center justify-center rounded px-1.5 py-0.5 text-[11px] leading-none tabular-nums ${
          active
            ? 'bg-[--overlay-1] text-[--color-foreground]/75'
            : 'bg-[--color-surface-2] text-[--color-muted-foreground]/80'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-[--color-muted-foreground]">
      {text}
    </div>
  );
}
