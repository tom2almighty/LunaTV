import { describe, expect, it } from 'vitest';

import { filterAdsFromM3U8 } from '@/app/play/services/m3u8-ad-filter';

describe('filterAdsFromM3U8', () => {
  it('removes discontinuity marker lines while preserving others', () => {
    const input = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXTINF:5.000,',
      'seg-001.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXTINF:5.000,',
      'seg-002.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');

    expect(filterAdsFromM3U8(input)).toBe(
      [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXTINF:5.000,',
        'seg-001.ts',
        '#EXTINF:5.000,',
        'seg-002.ts',
        '#EXT-X-ENDLIST',
      ].join('\n'),
    );
  });
});
