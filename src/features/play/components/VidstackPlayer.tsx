import { useEffect, useRef } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaCanPlayDetail,
  type MediaPlayerInstance,
  type MediaTimeUpdateEventDetail,
} from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

export interface VidstackPlayerProps {
  src: string;
  poster?: string;
  startTime?: number;
  title?: string;
  mirror?: boolean;
  aspectRatio?: string;
  onTimeUpdate?: (detail: MediaTimeUpdateEventDetail) => void;
  onEnded?: () => void;
  onCanPlay?: (detail: MediaCanPlayDetail) => void;
  onPause?: () => void;
  onError?: (err: unknown) => void;
}

export function VidstackPlayer({
  src,
  poster,
  startTime,
  title,
  mirror,
  aspectRatio,
  onTimeUpdate,
  onEnded,
  onCanPlay,
  onPause,
  onError,
}: VidstackPlayerProps) {
  const ref = useRef<MediaPlayerInstance>(null);
  const startTimeRef = useRef(startTime ?? 0);

  // Keep the latest startTime so canplay handler can use it
  useEffect(() => {
    startTimeRef.current = startTime ?? 0;
  }, [startTime]);

  // Apply mirror transform on the underlying <video> element
  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const video = player.el?.querySelector('video') as HTMLVideoElement | null;
    if (video) {
      video.style.transform = mirror ? 'scaleX(-1)' : '';
    }
  }, [mirror, src]);

  return (
    <MediaPlayer
      ref={ref}
      src={src}
      poster={poster}
      title={title}
      autoPlay
      playsInline
      crossOrigin
      volume={0.7}
      aspectRatio={aspectRatio}
      onCanPlay={(detail) => {
        const target = startTimeRef.current;
        if (target > 5) {
          const duration = ref.current?.duration ?? 0;
          if (!duration || target < duration - 2) {
            try {
              if (ref.current) ref.current.currentTime = target;
            } catch {
              /* ignore */
            }
          }
        }
        onCanPlay?.(detail);
      }}
      onTimeUpdate={(detail) => {
        onTimeUpdate?.(detail);
      }}
      onEnded={() => onEnded?.()}
      onPause={() => onPause?.()}
      onError={(err) => onError?.(err)}
      className="h-full w-full"
    >
      <MediaProvider>
        {poster && <Poster src={poster} alt={title ?? ''} className="vds-poster" />}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
