import { useCallback, useRef } from 'react';

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      const wakeLockApi = (navigator as WakeLockNavigator).wakeLock;
      if (!wakeLockApi) {
        return;
      }
      wakeLockRef.current = await wakeLockApi.request('screen');
    } catch {
      // Ignore wake lock acquisition failures on unsupported/restricted platforms.
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (!wakeLockRef.current) {
        return;
      }
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    } catch {
      // Ignore release failures if sentinel is already invalidated by the browser.
    }
  }, []);

  return {
    wakeLockRef,
    requestWakeLock,
    releaseWakeLock,
  };
}
