import { describe, expect, it } from 'vitest';

import {
  loadSearchContext,
  saveSearchContext,
} from '../search-context-storage';

describe('search context storage', () => {
  it('saves and loads snapshot through sessionStorage', () => {
    saveSearchContext({ query: '庆余年', viewMode: 'agg', scrollTop: 520 });
    const restored = loadSearchContext();
    expect(restored?.query).toBe('庆余年');
    expect(restored?.scrollTop).toBe(520);
  });
});
