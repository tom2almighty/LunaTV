import type { SiteConfig } from '@/lib/admin.types';
import { buildRuntimeConfig } from '@/lib/runtime-config';

describe('buildRuntimeConfig', () => {
  it('builds runtime config with new douban proxy schema', () => {
    const siteConfig: SiteConfig = {
      SiteName: 'MoonTV',
      Announcement: '',
      SearchDownstreamMaxPage: 5,
      SiteInterfaceCacheTime: 7200,
      DoubanDataCacheTime: 7200,
      DoubanDataProxyMode: 'preset',
      DoubanDataProxyPresetId: 'data-a',
      DoubanDataProxyCustomUrl: '',
      DoubanDataProxyPresets: [
        { id: 'data-a', name: 'A', url: 'https://a/?url=' },
      ],
      DoubanImageProxyMode: 'server',
      DoubanImageProxyPresetId: '',
      DoubanImageProxyCustomUrl: '',
      DoubanImageProxyPresets: [],
      DisableYellowFilter: false,
      FluidSearch: true,
      EnableRegistration: false,
      M3U8AdFilterEnabled: true,
    };
    const runtime = buildRuntimeConfig(siteConfig);

    expect(runtime.DOUBAN_DATA_PROXY_MODE).toBe('preset');
    expect(runtime.DOUBAN_DATA_PROXY_PRESETS).toHaveLength(1);
  });
});
