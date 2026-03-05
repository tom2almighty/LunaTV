import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchVirtualGrid } from '@/hooks/useSearchVirtualGrid';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    measure: vi.fn(),
  }),
}));

describe('useSearchVirtualGrid', () => {
  let resizeObserverConstructCount = 0;

  beforeEach(() => {
    resizeObserverConstructCount = 0;

    class ResizeObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();

      constructor() {
        resizeObserverConstructCount += 1;
      }
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('does not recreate ResizeObserver when only result count changes', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      value: 960,
      configurable: true,
    });

    const { result, rerender } = renderHook(
      ({ showResults, currentResultCount, viewMode }) =>
        useSearchVirtualGrid({ showResults, currentResultCount, viewMode }),
      {
        initialProps: {
          showResults: false,
          currentResultCount: 12,
          viewMode: 'agg' as const,
        },
      },
    );

    act(() => {
      result.current.virtualGridRef.current = container;
    });

    rerender({
      showResults: true,
      currentResultCount: 12,
      viewMode: 'agg' as const,
    });
    expect(resizeObserverConstructCount).toBe(1);

    rerender({
      showResults: true,
      currentResultCount: 36,
      viewMode: 'agg' as const,
    });
    expect(resizeObserverConstructCount).toBe(1);

    rerender({
      showResults: true,
      currentResultCount: 36,
      viewMode: 'all' as const,
    });
    expect(resizeObserverConstructCount).toBe(2);

    vi.restoreAllMocks();
  });
});
