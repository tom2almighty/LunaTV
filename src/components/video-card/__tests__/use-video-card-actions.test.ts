import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVideoCardActions } from '@/components/video-card/use-video-card-actions';
import { buildPlaySessionUrl } from '@/components/video-card/use-video-card-navigation';

describe('useVideoCardActions', () => {
  it('throttles repeated play actions within 800ms', async () => {
    const createSession = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useVideoCardActions(800));

    await result.current.executePlayAction(createSession);
    await result.current.executePlayAction(createSession);

    const createSessionCallCount = createSession.mock.calls.length;
    expect(createSessionCallCount).toBe(1);
  });

  it('builds play session URL without legacy query params', () => {
    const playUrl = buildPlaySessionUrl('abc123');
    expect(playUrl).toMatch(/^\/play\?ps=/);
    expect(playUrl.includes('source=')).toBe(false);
  });
});
