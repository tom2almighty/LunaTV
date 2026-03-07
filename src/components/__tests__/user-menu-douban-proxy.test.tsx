import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserMenu } from '@/components/UserMenu';

const requestJsonMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
  requestJson: (...args: unknown[]) => requestJsonMock(...args),
}));

vi.mock('@/components/user-menu/user-menu-container', () => ({
  UserMenuContainer: ({
    settingsPanel,
  }: {
    settingsPanel: React.ReactNode;
  }) => <div>{settingsPanel}</div>,
}));

describe('UserMenu douban proxy settings', () => {
  beforeEach(() => {
    localStorage.clear();
    requestJsonMock.mockResolvedValue({ username: 'alice', role: 'user' });
    (
      window as Window & { RUNTIME_CONFIG?: Record<string, unknown> }
    ).RUNTIME_CONFIG = {
      DOUBAN_DATA_PROXY_MODE: 'preset',
      DOUBAN_DATA_PROXY_PRESET_ID: 'data-a',
      DOUBAN_DATA_PROXY_CUSTOM_URL: '',
      DOUBAN_DATA_PROXY_PRESETS: [
        { id: 'data-a', name: 'Data A', url: 'https://data-a/?url=' },
      ],
      DOUBAN_IMAGE_PROXY_MODE: 'server',
      DOUBAN_IMAGE_PROXY_PRESET_ID: '',
      DOUBAN_IMAGE_PROXY_CUSTOM_URL: '',
      DOUBAN_IMAGE_PROXY_PRESETS: [],
      FLUID_SEARCH: true,
    };
  });

  it('uses runtime default on first load and renders the premium settings shell', async () => {
    const first = render(<UserMenu />);
    await waitFor(() => {
      expect(
        (screen.getByLabelText('豆瓣数据代理模式') as HTMLSelectElement).value,
      ).toBe('preset');
    });

    expect(
      screen.getByText('本地设置').closest('div[class*="app-panel"]'),
    ).toHaveClass('app-panel');
    expect(screen.getByLabelText('豆瓣数据代理模式')).toHaveClass(
      'app-control',
    );
    expect(
      screen.getByText('这些设置保存在本地浏览器中').parentElement,
    ).toHaveClass('border-white/8');

    localStorage.setItem('doubanDataProxyMode', 'custom');
    localStorage.setItem('doubanDataProxyCustomUrl', 'https://local/?url=');
    first.unmount();

    render(<UserMenu />);
    await waitFor(() => {
      expect(
        (screen.getByLabelText('豆瓣数据代理模式') as HTMLSelectElement).value,
      ).toBe('custom');
    });
  });
});
