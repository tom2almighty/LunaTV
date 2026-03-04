import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSearchPreviewState } from '../use-search-preview-state';

describe('useSearchPreviewState', () => {
  it('opens and closes preview with active payload', () => {
    const { result } = renderHook(() => useSearchPreviewState());
    act(() => result.current.openPreview({ key: 'agg-a', title: 'A' }));
    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.activePreview?.key).toBe('agg-a');
    act(() => result.current.closePreview());
    expect(result.current.isPreviewOpen).toBe(false);
  });
});
