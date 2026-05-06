/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layers, Play, Trash2 } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deletePlayRecord } from '@/lib/db';
import type { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';
import { createPlaySession, type PlaySessionResponse } from '@/lib/cms/detail';
import ImagePlaceholder from '@/components/ImagePlaceholder';
import { toast } from 'sonner';

const SESSION_KEY = 'vodhub_play_session';

export interface VideoCardProps {
  id?: string; source?: string; title?: string; query?: string;
  poster?: string; episodes?: number; source_name?: string;
  source_names?: string[]; progress?: number; year?: string;
  from: 'playrecord' | 'search' | 'douban';
  currentEpisode?: number; douban_id?: number; onDelete?: () => void;
  rate?: string; type?: string; isAggregate?: boolean;
  play_group?: SearchResult[];
}

function VideoCardFn({
  id, title = '', query = '', poster = '', episodes, source, source_name,
  source_names, progress = 0, year, from, currentEpisode,
  onDelete, rate, type = '', isAggregate = false, play_group,
}: VideoCardProps) {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  const actualPoster = processImageUrl(poster);
  const actualEpisodes = episodes;

  const handlePlay = useCallback(async () => {
    if (from === 'douban') {
      const kw = (title || query || '').trim();
      if (!kw) return;
      navigate(`/search?q=${encodeURIComponent(kw)}`);
      return;
    }
    if (isRouting) return;
    setIsRouting(true);
    try {
      let payload: any;
      if (play_group?.length) {
        payload = {
          mode: 'group', title, year,
          type: actualEpisodes === 1 ? 'movie' : 'tv',
          query: query || title,
          preferredSource: source, preferredId: id,
          candidates: play_group,
        };
      } else if (source && id) {
        payload = {
          mode: 'direct', source, id, title, year,
          type: actualEpisodes === 1 ? 'movie' : 'tv',
          query: query || title,
        };
      } else {
        payload = { mode: 'search', keyword: query || title, expectedTitle: title, expectedYear: year };
      }
      const data = await createPlaySession(payload) as PlaySessionResponse;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      navigate('/play');
    } catch (err: any) {
      toast.error(err?.message || '加载播放源失败');
    } finally { setIsRouting(false); }
  }, [isRouting, from, title, year, actualEpisodes, query, source, id, play_group, navigate]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (from !== 'playrecord' || !source || !id) return;
    try { await deletePlayRecord(source, id); onDelete?.(); } catch { toast.error('删除失败'); }
  }, [from, source, id, onDelete]);

  const show = useMemo(() => ({
    progress: from === 'playrecord',
    delete: from === 'playrecord',
    sourceTag: from !== 'douban' && !!source_name,
  }), [from, source_name]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _type = type;

  const sourceCount = isAggregate && source_names ? new Set(source_names).size : 0;
  const ratingNum = rate ? parseFloat(rate) : 0;

  return (
    <div className="group cursor-pointer" onClick={handlePlay}>
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-xl border border-[--color-card-border] bg-[--color-surface] shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 group-hover:-translate-y-1 group-hover:border-[--color-card-border-hover] group-hover:shadow-[0_24px_60px_-18px_rgba(229,9,20,0.22),0_10px_28px_-12px_rgba(0,0,0,0.78)]"
        style={{ transitionTimingFunction: 'var(--ease-soft)' }}
      >
        {!imgLoaded && <ImagePlaceholder />}
        <img
          src={actualPoster}
          alt={title}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.retried) {
              img.dataset.retried = 'true';
              setTimeout(() => { img.src = processImageUrl(poster); }, 1500);
            }
          }}
        />

        {/* Bottom shadow for legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        {/* Hover overlay with red play button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/42 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-accent] text-[--color-accent-foreground] shadow-[var(--shadow-accent)] ring-2 ring-white/15">
            <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={0} />
          </div>
        </div>

        {/* Loading state */}
        {isRouting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="spinner" />
          </div>
        )}

        {/* Year (top-left) */}
        {year && year !== 'unknown' && (
          <div className="absolute left-2 top-2 rounded bg-[--color-badge-bg] px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
            {year}
          </div>
        )}

        {/* Rating (top-right, douban) */}
        {ratingNum > 0 && (
          <div className="absolute right-2 top-2 rounded bg-[--color-warning] px-1.5 py-0.5 text-[10px] font-bold text-black">
            {rate}
          </div>
        )}

        {/* Episode count */}
        {!ratingNum && actualEpisodes !== undefined && actualEpisodes > 1 && (
          <div className="absolute right-2 top-2 rounded bg-[--color-badge-bg] px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
            {currentEpisode ? `${currentEpisode}/${actualEpisodes}` : `${actualEpisodes}集`}
          </div>
        )}

        {/* Aggregate source count */}
        {sourceCount > 1 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-[--color-badge-bg] px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
            <Layers className="h-2.5 w-2.5" strokeWidth={2} />
            {sourceCount}
          </div>
        )}

        {/* Delete (history rows only) */}
        {show.delete && (
          <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={handleDelete}
              className="flex h-7 w-7 items-center justify-center rounded bg-[--color-badge-bg] text-white/85 backdrop-blur-sm transition-colors hover:bg-[--color-accent] hover:text-white"
              aria-label="从历史记录中移除"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar (history rows) */}
      {show.progress && (
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded bg-white/[0.08]">
          <div className="h-full bg-[--color-accent] transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}

      {/* Title + meta */}
      <div className="mt-2.5 space-y-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[--color-foreground] transition-colors group-hover:text-[--color-accent-soft]">
          {title}
        </h3>
        {show.sourceTag && (
          <p className="truncate text-xs text-[--color-muted-foreground]">
            {source_name}
          </p>
        )}
      </div>
    </div>
  );
}

const VideoCard = memo(VideoCardFn);
export default VideoCard;
