import { useCallback, useRef } from 'react';

type VideoWithHls = HTMLVideoElement & {
  hls?: {
    stopLoad?: () => void;
    detachMedia?: () => void;
    destroy?: () => void;
  };
};

type ArtPlayerLike = {
  video?: HTMLVideoElement;
  destroy: () => void;
};

export function useArtPlayerInstance() {
  const artPlayerRef = useRef<any>(null);
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
      } catch (err) {
        console.warn('Destroy HLS instance failed:', err);
      } finally {
        video.hls = undefined;
      }
    },
    [],
  );

  const cleanupPlayer = useCallback(() => {
    const player = artPlayerRef.current as ArtPlayerLike | null;
    if (!player) {
      return;
    }

    try {
      destroyHlsInstance(player.video as VideoWithHls | undefined);
      player.destroy();
    } catch (err) {
      console.warn('Cleanup art player failed:', err);
    } finally {
      artPlayerRef.current = null;
    }
  }, [destroyHlsInstance]);

  return {
    artPlayerRef,
    artContainerRef,
    destroyHlsInstance,
    cleanupPlayer,
  };
}
