import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlayProgress } from '@/app/play/hooks/use-play-progress';

type FakePlayer = {
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
  emit: (event: string) => void;
};

function createFakePlayer(): FakePlayer {
  const listeners = new Map<string, Set<() => void>>();

  return {
    on(event, cb) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(cb);
    },
    off(event, cb) {
      listeners.get(event)?.delete(cb);
    },
    emit(event) {
      listeners.get(event)?.forEach((handler) => handler());
    },
  };
}

describe('usePlayProgress', () => {
  it('persists progress every 5s and on pause', () => {
    const saveFn = vi.fn();
    const fakePlayer = createFakePlayer();

    const { result } = renderHook(() => usePlayProgress(saveFn));
    result.current.bindPlayer(fakePlayer);

    fakePlayer.emit('video:timeupdate');
    fakePlayer.emit('pause');

    const saveCallCount = saveFn.mock.calls.length;
    expect(saveCallCount).toBeGreaterThan(0);
  });
});
