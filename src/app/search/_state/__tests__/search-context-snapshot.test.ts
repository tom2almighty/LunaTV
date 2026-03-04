import { describe, expect, it } from 'vitest';

import {
  parseSearchContextSnapshot,
  serializeSearchContextSnapshot,
} from '../search-context-snapshot';

describe('search context snapshot', () => {
  it('serializes and parses a valid payload', () => {
    const raw = serializeSearchContextSnapshot({
      query: '庆余年',
      viewMode: 'agg',
      filterAll: {
        source: 'all',
        title: 'all',
        year: 'all',
        yearOrder: 'none',
      },
      filterAgg: {
        source: 'all',
        title: 'all',
        year: 'all',
        yearOrder: 'desc',
      },
      scrollTop: 640,
      activeKey: 'agg-庆余年-2024-tv',
    });
    const parsed = parseSearchContextSnapshot(raw);
    expect(parsed?.query).toBe('庆余年');
    expect(parsed?.scrollTop).toBe(640);
  });
});
