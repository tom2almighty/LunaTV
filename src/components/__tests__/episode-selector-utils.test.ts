import { describe, expect, it } from 'vitest';

import {
  sortSourcesWithCurrentFirst,
  toHorizontalScrollDelta,
} from '@/components/EpisodeSelector';

describe('EpisodeSelector utils', () => {
  it('keeps current source at the first position', () => {
    const sorted = sortSourcesWithCurrentFirst(
      [
        { source: 'b', id: '2' },
        { source: 'a', id: '1' },
        { source: 'c', id: '3' },
      ],
      'a',
      '1',
    );

    expect(sorted[0]).toMatchObject({ source: 'a', id: '1' });
  });

  it('converts vertical wheel to horizontal delta with bounded speed', () => {
    expect(toHorizontalScrollDelta(30)).toBe(60);
    expect(toHorizontalScrollDelta(500)).toBe(240);
    expect(toHorizontalScrollDelta(-500)).toBe(-240);
  });
});
