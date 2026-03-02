import { useCallback, useRef } from 'react';

type EventPlayer = {
  on?: (event: string, callback: () => void) => void;
  off?: (event: string, callback: () => void) => void;
};

export function usePlayProgress(
  saveFn: () => void | Promise<void>,
  intervalMs = 5000,
) {
  const lastSaveAtRef = useRef(0);

  const bindPlayer = useCallback(
    (player: EventPlayer | null | undefined) => {
      if (!player || typeof player.on !== 'function') {
        return () => {};
      }

      const handleTimeUpdate = () => {
        const now = Date.now();
        if (now - lastSaveAtRef.current >= intervalMs) {
          void saveFn();
          lastSaveAtRef.current = now;
        }
      };

      const handlePause = () => {
        void saveFn();
        lastSaveAtRef.current = Date.now();
      };

      player.on('video:timeupdate', handleTimeUpdate);
      player.on('pause', handlePause);

      return () => {
        if (typeof player.off === 'function') {
          player.off('video:timeupdate', handleTimeUpdate);
          player.off('pause', handlePause);
        }
      };
    },
    [intervalMs, saveFn],
  );

  return {
    bindPlayer,
    lastSaveAtRef,
  };
}
