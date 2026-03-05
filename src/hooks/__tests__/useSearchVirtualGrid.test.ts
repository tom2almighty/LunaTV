import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchVirtualGrid } from '@/hooks/useSearchVirtualGrid';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    measure: vi.fn(),
  }),
}));

describe('useSearchVirtualGrid', () => {
  type HookProps = {
    showResults: boolean;
    currentResultCount: number;
    viewMode: 'agg' | 'all';
  };

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

    const initialProps: HookProps = {
      showResults: false,
      currentResultCount: 12,
      viewMode: 'agg',
    };

    const { result, rerender } = renderHook(
      ({ showResults, currentResultCount, viewMode }: HookProps) =>
        useSearchVirtualGrid({ showResults, currentResultCount, viewMode }),
      {
        initialProps,
      },
    );

    act(() => {
      result.current.virtualGridRef.current = container;
    });

    rerender({
      showResults: true,
      currentResultCount: 12,
      viewMode: 'agg',
    });
    expect(resizeObserverConstructCount).toBe(1);

    rerender({
      showResults: true,
      currentResultCount: 36,
      viewMode: 'agg',
    });
    expect(resizeObserverConstructCount).toBe(1);

    rerender({
      showResults: true,
      currentResultCount: 36,
      viewMode: 'all',
    });
    expect(resizeObserverConstructCount).toBe(2);

    vi.restoreAllMocks();
  });
});
