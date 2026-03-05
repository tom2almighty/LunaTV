import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminConfig } from '@/lib/admin.types';

const dbState = vi.hoisted(() => ({
  siteName: 'v1',
}));

const getAdminConfigMock = vi.hoisted(() => vi.fn());
const saveAdminConfigMock = vi.hoisted(() => vi.fn(async () => undefined));
const getAllUsersMock = vi.hoisted(() => vi.fn(async () => ['admin']));

vi.mock('@/lib/db.server', () => ({
  getAdminConfig: getAdminConfigMock,
  saveAdminConfig: saveAdminConfigMock,
  getAllUsers: getAllUsersMock,
}));

function buildAdminConfig(siteName: string): AdminConfig {
  return {
    ConfigSubscribtion: {
      URL: '',
      AutoUpdate: false,
      LastCheck: '',
    },
    ConfigFile: '',
    SiteConfig: {
      SiteName: siteName,
      Announcement: '',
      SearchDownstreamMaxPage: 5,
      SiteInterfaceCacheTime: 7200,
      DoubanDataCacheTime: 7200,
      DoubanDataProxyMode: 'server',
      DoubanDataProxyPresetId: '',
      DoubanDataProxyCustomUrl: '',
      DoubanDataProxyPresets: [],
      DoubanImageProxyMode: 'server',
      DoubanImageProxyPresetId: '',
      DoubanImageProxyCustomUrl: '',
      DoubanImageProxyPresets: [],
      DisableYellowFilter: false,
      FluidSearch: true,
      EnableRegistration: false,
      M3U8AdFilterEnabled: true,
    },
    UserConfig: {
      Users: [
        {
          username: 'admin',
          role: 'owner',
          banned: false,
        },
      ],
    },
    SourceConfig: [],
  };
}

describe('getConfig freshness', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    dbState.siteName = 'v1';
    getAdminConfigMock.mockImplementation(async () =>
      buildAdminConfig(dbState.siteName),
    );
  });

  it('getConfig reflects latest persisted config', async () => {
    const { getConfig } = await import('@/lib/config');

    expect((await getConfig()).SiteConfig.SiteName).toBe('v1');
    dbState.siteName = 'v2';
    expect((await getConfig()).SiteConfig.SiteName).toBe('v2');
  });
});
