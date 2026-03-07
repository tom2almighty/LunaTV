import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchPageInit } from '@/hooks/useSearchPageInit';

vi.mock('@/lib/db', () => ({
  getSearchHistory: vi.fn().mockResolvedValue([]),
  subscribeToDataUpdates: vi.fn().mockReturnValue(() => {}),
}));

describe('useSearchPageInit', () => {
  beforeEach(() => {
    localStorage.clear();
    (
      window as Window & { RUNTIME_CONFIG?: Record<string, unknown> }
    ).RUNTIME_CONFIG = {
      FLUID_SEARCH: true,
    };
  });

  it('prefers runtime fluid-search config instead of local overrides', async () => {
    const setUseFluidSearch = vi.fn();
    localStorage.setItem('fluidSearch', 'false');

    renderHook(() =>
      useSearchPageInit({
        hasQuery: true,
        setUseFluidSearch,
      }),
    );

    await waitFor(() => {
      expect(setUseFluidSearch).toHaveBeenCalledWith(true);
    });
  });
});
