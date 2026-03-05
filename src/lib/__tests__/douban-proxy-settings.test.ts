import { describe, expect, it } from 'vitest';

import {
  resolveDoubanDataProxy,
  resolveDoubanImageProxy,
} from '@/lib/douban-proxy-settings';

describe('douban proxy settings resolver', () => {
  it('resolves data proxy url from preset mode', () => {
    const result = resolveDoubanDataProxy({
      runtime: {
        mode: 'server',
        presetId: '',
        customUrl: '',
        presets: [{ id: 'p1', name: 'P1', url: 'https://p1/?url=' }],
      },
      storage: { mode: 'preset', presetId: 'p1' },
    });

    expect(result.proxyType).toBe('custom');
    expect(result.proxyUrl).toBe('https://p1/?url=');
  });

  it('falls back to server when preset id is missing', () => {
    const result = resolveDoubanDataProxy({
      runtime: {
        mode: 'preset',
        presetId: 'missing',
        customUrl: '',
        presets: [{ id: 'p1', name: 'P1', url: 'https://p1/?url=' }],
      },
      storage: {},
    });

    expect(result.proxyType).toBe('server');
    expect(result.proxyUrl).toBe('');
  });

  it('resolves image proxy custom url when valid', () => {
    const result = resolveDoubanImageProxy({
      runtime: {
        mode: 'server',
        presetId: '',
        customUrl: '',
        presets: [],
      },
      storage: { mode: 'custom', customUrl: 'https://img/?url=' },
    });

    expect(result.proxyType).toBe('custom');
    expect(result.proxyUrl).toBe('https://img/?url=');
  });
});
