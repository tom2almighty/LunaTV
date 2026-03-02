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
});
