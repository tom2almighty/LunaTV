import { useCallback, useRef } from 'react';

export function useVideoCardActions(throttleMs = 800) {
  const lastPlayActionAtRef = useRef(0);

  const executePlayAction = useCallback(
    async (createSession: () => Promise<void>) => {
      const now = Date.now();
      if (now - lastPlayActionAtRef.current < throttleMs) {
        return;
      }

      lastPlayActionAtRef.current = now;
      await createSession();
    },
    [throttleMs],
  );

  return {
    executePlayAction,
    lastPlayActionAtRef,
  };
}
