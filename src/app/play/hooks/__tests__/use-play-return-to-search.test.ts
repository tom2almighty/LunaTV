import { describe, expect, it } from 'vitest';

import { buildReturnSearchUrl } from '../use-play-return-to-search';

describe('play return search url', () => {
  it('returns query-based search path with restore marker', () => {
    expect(buildReturnSearchUrl('庆余年')).toBe(
      '/search?q=%E5%BA%86%E4%BD%99%E5%B9%B4&restore=1',
    );
  });
});
