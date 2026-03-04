import { describe, expect, it } from 'vitest';

import { resolveEpisodeIndexOnSourceChange } from '@/app/play/hooks/use-play-page-state';

describe('usePlayPageState', () => {
  it('keeps selected episode when source changes if still in range', () => {
    expect(resolveEpisodeIndexOnSourceChange(2, 5)).toBe(2);
    expect(resolveEpisodeIndexOnSourceChange(4, 3)).toBe(0);
  });

  it('resets to first episode when episode list becomes empty', () => {
    expect(resolveEpisodeIndexOnSourceChange(1, 0)).toBe(0);
  });
});
