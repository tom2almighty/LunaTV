import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBackToTopVisibility } from '@/hooks/useBackToTopVisibility';

describe('useBackToTopVisibility', () => {
  it('schedules visibility checks only on events (no perpetual raf loop)', () => {
    const callbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameMock = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callbacks.push(callback);
        return callbacks.length;
      });
    const cancelAnimationFrameMock = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    const container = document.createElement('div');
    const ref = { current: container };

    renderHook(() => useBackToTopVisibility(ref, 300));
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

    const firstCallback = callbacks.shift();
    expect(firstCallback).toBeTruthy();
    act(() => {
      firstCallback?.(0);
    });
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

    act(() => {
      document.body.dispatchEvent(new Event('scroll'));
    });
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2);

    requestAnimationFrameMock.mockRestore();
    cancelAnimationFrameMock.mockRestore();
  });

  it('updates visibility based on scroll threshold', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const container = document.createElement('div');
    container.scrollTop = 0;
    const ref = { current: container };

    const { result } = renderHook(() => useBackToTopVisibility(ref, 300));
    act(() => {
      callbacks.shift()?.(0);
    });
    expect(result.current).toBe(false);

    act(() => {
      container.scrollTop = 360;
      container.dispatchEvent(new Event('scroll'));
      callbacks.shift()?.(0);
    });
    expect(result.current).toBe(true);

    act(() => {
      container.scrollTop = 100;
      container.dispatchEvent(new Event('scroll'));
      callbacks.shift()?.(0);
    });
    expect(result.current).toBe(false);

    vi.restoreAllMocks();
  });
});
