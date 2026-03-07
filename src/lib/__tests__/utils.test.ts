import { beforeEach, describe, expect, it } from 'vitest';

import type { RuntimeConfig } from '@/lib/runtime-config';
import { processImageUrl } from '@/lib/utils';

const baseRuntimeConfig: RuntimeConfig = {
  DOUBAN_DATA_PROXY_MODE: 'server',
  DOUBAN_DATA_PROXY_PRESET_ID: '',
  DOUBAN_DATA_PROXY_CUSTOM_URL: '',
  DOUBAN_DATA_PROXY_PRESETS: [],
  DOUBAN_IMAGE_PROXY_MODE: 'preset',
  DOUBAN_IMAGE_PROXY_PRESET_ID: 'img-a',
  DOUBAN_IMAGE_PROXY_CUSTOM_URL: '',
  DOUBAN_IMAGE_PROXY_PRESETS: [
    { id: 'img-a', name: 'Image A', url: 'https://img-a/?url=' },
  ],
  DISABLE_YELLOW_FILTER: false,
  FLUID_SEARCH: true,
  M3U8_AD_FILTER_ENABLED: true,
};

describe('processImageUrl', () => {
  const doubanPoster =
    'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p123.webp';

  beforeEach(() => {
    localStorage.clear();
  });

  it('uses runtime proxy during the stable first render', () => {
    const result = processImageUrl(doubanPoster, {
      runtimeConfig: baseRuntimeConfig,
    });

    expect(result).toBe(
      `https://img-a/?url=${encodeURIComponent(doubanPoster)}`,
    );
  });

  it('keeps using runtime proxy even if stale local overrides exist', () => {
    localStorage.setItem('doubanImageProxyMode', 'custom');
    localStorage.setItem(
      'doubanImageProxyCustomUrl',
      'https://local-img/?url=',
    );

    const result = processImageUrl(doubanPoster, {
      runtimeConfig: baseRuntimeConfig,
    });

    expect(result).toBe(
      `https://img-a/?url=${encodeURIComponent(doubanPoster)}`,
    );
  });
});
