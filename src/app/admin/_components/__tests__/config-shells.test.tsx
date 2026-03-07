import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminConfig } from '@/lib/admin.types';

import { ConfigFileComponent } from '@/app/admin/_components/ConfigFileComponent';
import { UserStatCard } from '@/app/admin/_components/user-config/user-stat-card';

function buildConfig(): AdminConfig {
  return {
    ConfigSubscribtion: {
      URL: 'https://example.com/config.json',
      AutoUpdate: true,
      LastCheck: '2026-03-07T00:00:00.000Z',
    },
    ConfigFile: '{"name":"MoonTV"}',
    SiteConfig: {
      SiteName: 'MoonTV',
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
    UserConfig: { Users: [] },
    SourceConfig: [],
  };
}

describe('admin config shells', () => {
  it('renders premium config surfaces and stat cards', () => {
    render(
      <>
        <ConfigFileComponent
          config={buildConfig()}
          refreshConfig={vi.fn().mockResolvedValue(undefined)}
        />
        <UserStatCard label='总用户数' value={12} />
      </>,
    );

    expect(
      screen.getByText('配置订阅').closest('div[class*="app-panel"]'),
    ).toHaveClass('app-panel');
    expect(
      screen.getByPlaceholderText('https://example.com/config.json'),
    ).toHaveClass('app-control');
    expect(screen.getByText('总用户数').parentElement).toHaveClass(
      'rounded-[1.25rem]',
    );
  });
});
