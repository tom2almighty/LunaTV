import { type MutableRefObject, useCallback, useRef } from 'react';

type VideoWithHls = HTMLVideoElement & {
  hls?: {
    stopLoad?: () => void;
    detachMedia?: () => void;
    destroy?: () => void;
  };
};

type ArtPlayerLike = {
  video?: HTMLVideoElement;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  paused: boolean;
  fullscreen: boolean;
  title: string;
  poster: string;
  notice: {
    show: string;
  };
  setting: {
    update: (config: unknown) => void;
  };
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off?: (event: string, callback: (...args: unknown[]) => void) => void;
  toggle: () => void;
  switch: string | ((url: string) => void);
  pause: () => void;
  destroy: () => void;
};

export function useArtPlayerInstance() {
  const artPlayerRef = useRef<ArtPlayerLike | null>(null);
  const artContainerRef = useRef<HTMLDivElement | null>(null);

  const destroyHlsInstance = useCallback(
    (video: VideoWithHls | null | undefined) => {
      if (!video?.hls) {
        return;
      }

      try {
        if (typeof video.hls.stopLoad === 'function') {
          video.hls.stopLoad();
        }
        if (typeof video.hls.detachMedia === 'function') {
          video.hls.detachMedia();
        }
        if (typeof video.hls.destroy === 'function') {
          video.hls.destroy();
        }
      } catch {
        // Ignore teardown errors to keep player cleanup non-blocking.
      } finally {
        video.hls = undefined;
      }
    },
    [],
  );

  const cleanupPlayer = useCallback(() => {
    const player = artPlayerRef.current;
    if (!player) {
      return;
    }

    try {
      destroyHlsInstance(player.video as VideoWithHls | undefined);
      player.destroy();
    } catch {
      // Ignore teardown errors to avoid blocking route transitions.
    } finally {
      artPlayerRef.current = null;
    }
  }, [destroyHlsInstance]);

  return {
    artPlayerRef: artPlayerRef as MutableRefObject<ArtPlayerLike>,
    artContainerRef,
    destroyHlsInstance,
    cleanupPlayer,
  };
}
