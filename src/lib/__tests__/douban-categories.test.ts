import { describe, expect, it } from 'vitest';

import { buildRecentHotParams } from '@/lib/douban-categories';

describe('buildRecentHotParams', () => {
  it('uses pageLimit=20 as default for movie/tv/show', () => {
    const movie = buildRecentHotParams({
      type: 'movie',
      primarySelection: '热门',
      secondarySelection: '全部',
    });
    const tv = buildRecentHotParams({
      type: 'tv',
      primarySelection: '最近热门',
      secondarySelection: 'tv',
    });
    const show = buildRecentHotParams({
      type: 'show',
      primarySelection: '最近热门',
      secondarySelection: 'show',
    });

    expect(movie.pageLimit).toBe(20);
    expect(tv.pageLimit).toBe(20);
    expect(show.pageLimit).toBe(20);
  });
});
