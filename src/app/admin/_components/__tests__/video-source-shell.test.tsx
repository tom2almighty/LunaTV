import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminConfig } from '@/lib/admin.types';

import { VideoSourceConfig } from '@/app/admin/_components/VideoSourceConfig';

function buildConfig(): AdminConfig {
  return {
    ConfigSubscribtion: { URL: '', AutoUpdate: false, LastCheck: '' },
    ConfigFile: '',
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
    SourceConfig: [
      {
        name: '线路A',
        key: 'a',
        api: 'https://a.example/api',
        detail: '',
        disabled: false,
        from: 'config',
      },
    ],
  };
}

describe('VideoSourceConfig view', () => {
  it('renders premium table shell and add-source form controls', () => {
    render(
      <VideoSourceConfig
        config={buildConfig()}
        refreshConfig={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(
      screen.getByText('线路A').closest('div[data-table="source-list"]'),
    ).toHaveClass('app-panel');

    fireEvent.click(screen.getByRole('button', { name: '添加视频源' }));

    expect(screen.getByPlaceholderText('名称')).toHaveClass('app-control');
  });
});
