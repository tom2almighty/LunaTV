import { describe, expect, it } from 'vitest';

import {
  isPlayableEpisodeIndex,
  shouldReuseExistingPlayer,
} from '@/app/play/services/player-lifecycle';

describe('player lifecycle utils', () => {
  it('validates episode index by total episodes', () => {
    expect(isPlayableEpisodeIndex(0, 1)).toBe(true);
    expect(isPlayableEpisodeIndex(2, 2)).toBe(false);
    expect(isPlayableEpisodeIndex(-1, 2)).toBe(false);
  });

  it('reuses existing player only on non-webkit with existing instance', () => {
    expect(
      shouldReuseExistingPlayer({
        hasPlayerInstance: true,
        isWebkit: false,
      }),
    ).toBe(true);

    expect(
      shouldReuseExistingPlayer({
        hasPlayerInstance: true,
        isWebkit: true,
      }),
    ).toBe(false);

    expect(
      shouldReuseExistingPlayer({
        hasPlayerInstance: false,
        isWebkit: false,
      }),
    ).toBe(false);
  });
});
