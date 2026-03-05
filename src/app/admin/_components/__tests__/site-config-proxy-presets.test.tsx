import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminConfig } from '@/lib/admin.types';

import { SiteConfigComponent } from '@/app/admin/_components/SiteConfigComponent';

function buildConfig(): AdminConfig {
  return {
    ConfigSubscribtion: {
      URL: '',
      AutoUpdate: false,
      LastCheck: '',
    },
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
    UserConfig: {
      Users: [],
    },
    SourceConfig: [],
  };
}

describe('SiteConfigComponent douban proxy presets', () => {
  it('shows 3 options for data/image proxy mode and manages preset list', () => {
    render(
      <SiteConfigComponent
        config={buildConfig()}
        refreshConfig={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByLabelText('豆瓣数据代理模式')).toBeInTheDocument();
    expect(screen.getByLabelText('豆瓣图片代理模式')).toBeInTheDocument();

    const dataMode = screen.getByLabelText(
      '豆瓣数据代理模式',
    ) as HTMLSelectElement;
    const imageMode = screen.getByLabelText(
      '豆瓣图片代理模式',
    ) as HTMLSelectElement;
    expect(dataMode.options).toHaveLength(3);
    expect(imageMode.options).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: '新增数据预设' }));
    fireEvent.change(screen.getByLabelText('数据预设名称-1'), {
      target: { value: 'Data A' },
    });
    fireEvent.change(screen.getByLabelText('数据预设地址-1'), {
      target: { value: 'https://data-a/?url=' },
    });

    expect(
      (screen.getByLabelText('数据预设名称-1') as HTMLInputElement).value,
    ).toBe('Data A');
    expect(
      (screen.getByLabelText('数据预设地址-1') as HTMLInputElement).value,
    ).toBe('https://data-a/?url=');
  });
});
