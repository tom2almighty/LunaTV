import { describe, expect, it, vi } from 'vitest';

import {
  closeEventSourceSafely,
  isStaleSearchPayload,
} from '@/hooks/useSearchExecution';

describe('useSearchExecution', () => {
  it('closes old EventSource and ignores stale payload when query changes', () => {
    const close = vi.fn();
    const eventSource = {
      close,
    } as unknown as EventSource;

    closeEventSourceSafely(eventSource);
    expect(close).toHaveBeenCalledTimes(1);

    const staleResultsApplied = !isStaleSearchPayload({
      currentQuery: 'new query',
      expectedQuery: 'old query',
      currentRunToken: 2,
      payloadRunToken: 1,
    });
    expect(staleResultsApplied).toBe(false);
  });

  it('treats payload staleness by query and run token business rules', () => {
    expect(
      isStaleSearchPayload({
        currentQuery: 'naruto',
        expectedQuery: 'naruto',
        currentRunToken: 7,
        payloadRunToken: 7,
      }),
    ).toBe(false);

    expect(
      isStaleSearchPayload({
        currentQuery: 'naruto',
        expectedQuery: 'naruto',
        currentRunToken: 7,
        payloadRunToken: 6,
      }),
    ).toBe(true);
  });
});
