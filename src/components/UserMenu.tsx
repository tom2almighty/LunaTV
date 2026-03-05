/* eslint-disable no-console,@typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

'use client';

import { KeyRound, LogOut, Settings, Shield, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { requestJson } from '@/lib/api/client';

import { useUserSettings } from '@/components/user-menu/use-user-settings';
import { UserMenuContainer } from '@/components/user-menu/user-menu-container';

interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

type ProxyMode = 'server' | 'preset' | 'custom';

type RuntimeProxyPreset = {
  id: string;
  name: string;
  url: string;
};

type RuntimeConfig = {
  DOUBAN_DATA_PROXY_MODE?: ProxyMode;
  DOUBAN_DATA_PROXY_PRESET_ID?: string;
  DOUBAN_DATA_PROXY_CUSTOM_URL?: string;
  DOUBAN_DATA_PROXY_PRESETS?: RuntimeProxyPreset[];
  DOUBAN_IMAGE_PROXY_MODE?: ProxyMode;
  DOUBAN_IMAGE_PROXY_PRESET_ID?: string;
  DOUBAN_IMAGE_PROXY_CUSTOM_URL?: string;
  DOUBAN_IMAGE_PROXY_PRESETS?: RuntimeProxyPreset[];
  FLUID_SEARCH?: boolean;
};

const normalizeMode = (value: unknown): ProxyMode => {
  if (value === 'server' || value === 'preset' || value === 'custom') {
    return value;
  }
  return 'server';
};

const normalizePresets = (presets: unknown): RuntimeProxyPreset[] => {
  if (!Array.isArray(presets)) {
    return [];
  }
  return presets.filter(
    (preset): preset is RuntimeProxyPreset =>
      typeof preset === 'object' &&
      preset !== null &&
      typeof preset.id === 'string' &&
      typeof preset.name === 'string' &&
      typeof preset.url === 'string',
  );
};

export const UserMenu: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    isChangePasswordOpen,
    setIsChangePasswordOpen,
  } = useUserSettings();
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  // Body 滚动锁定 - 使用 overflow 方式避免布局问题
  useEffect(() => {
    if (isSettingsOpen || isChangePasswordOpen) {
      const body = document.body;
      const html = document.documentElement;

      // 保存原始样式
      const originalBodyOverflow = body.style.overflow;
      const originalHtmlOverflow = html.style.overflow;

      // 只设置 overflow 来阻止滚动
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';

      return () => {
        // 恢复所有原始样式
        body.style.overflow = originalBodyOverflow;
        html.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isSettingsOpen, isChangePasswordOpen]);

  // 设置相关状态
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true);
  const [fluidSearch, setFluidSearch] = useState(true);
  const [doubanDataProxyMode, setDoubanDataProxyMode] =
    useState<ProxyMode>('server');
  const [doubanDataProxyPresetId, setDoubanDataProxyPresetId] = useState('');
  const [doubanDataProxyCustomUrl, setDoubanDataProxyCustomUrl] = useState('');
  const [doubanImageProxyMode, setDoubanImageProxyMode] =
    useState<ProxyMode>('server');
  const [doubanImageProxyPresetId, setDoubanImageProxyPresetId] = useState('');
  const [doubanImageProxyCustomUrl, setDoubanImageProxyCustomUrl] =
    useState('');
  const [doubanDataProxyPresets, setDoubanDataProxyPresets] = useState<
    RuntimeProxyPreset[]
  >([]);
  const [doubanImageProxyPresets, setDoubanImageProxyPresets] = useState<
    RuntimeProxyPreset[]
  >([]);

  // 修改密码相关状态
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取认证信息
  useEffect(() => {
    let cancelled = false;

    requestJson<AuthInfo>('/api/auth/sessions/me')
      .then((session) => {
        if (!cancelled) {
          setAuthInfo(session);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthInfo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const runtimeConfig = ((window as any).RUNTIME_CONFIG ||
        {}) as RuntimeConfig;
      const savedAggregateSearch = localStorage.getItem(
        'defaultAggregateSearch',
      );
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      setDoubanDataProxyPresets(
        normalizePresets(runtimeConfig.DOUBAN_DATA_PROXY_PRESETS),
      );
      setDoubanImageProxyPresets(
        normalizePresets(runtimeConfig.DOUBAN_IMAGE_PROXY_PRESETS),
      );

      const defaultDoubanDataProxyMode = normalizeMode(
        runtimeConfig.DOUBAN_DATA_PROXY_MODE,
      );
      const defaultDoubanDataProxyPresetId =
        runtimeConfig.DOUBAN_DATA_PROXY_PRESET_ID || '';
      const defaultDoubanDataProxyCustomUrl =
        runtimeConfig.DOUBAN_DATA_PROXY_CUSTOM_URL || '';
      const savedDoubanDataProxyMode = localStorage.getItem(
        'doubanDataProxyMode',
      );
      setDoubanDataProxyMode(
        savedDoubanDataProxyMode === null
          ? defaultDoubanDataProxyMode
          : normalizeMode(savedDoubanDataProxyMode),
      );
      setDoubanDataProxyPresetId(
        localStorage.getItem('doubanDataProxyPresetId') ||
          defaultDoubanDataProxyPresetId,
      );
      setDoubanDataProxyCustomUrl(
        localStorage.getItem('doubanDataProxyCustomUrl') ||
          defaultDoubanDataProxyCustomUrl,
      );

      const defaultDoubanImageProxyMode = normalizeMode(
        runtimeConfig.DOUBAN_IMAGE_PROXY_MODE,
      );
      const defaultDoubanImageProxyPresetId =
        runtimeConfig.DOUBAN_IMAGE_PROXY_PRESET_ID || '';
      const defaultDoubanImageProxyCustomUrl =
        runtimeConfig.DOUBAN_IMAGE_PROXY_CUSTOM_URL || '';
      const savedDoubanImageProxyMode = localStorage.getItem(
        'doubanImageProxyMode',
      );
      setDoubanImageProxyMode(
        savedDoubanImageProxyMode === null
          ? defaultDoubanImageProxyMode
          : normalizeMode(savedDoubanImageProxyMode),
      );
      setDoubanImageProxyPresetId(
        localStorage.getItem('doubanImageProxyPresetId') ||
          defaultDoubanImageProxyPresetId,
      );
      setDoubanImageProxyCustomUrl(
        localStorage.getItem('doubanImageProxyCustomUrl') ||
          defaultDoubanImageProxyCustomUrl,
      );

      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch = runtimeConfig.FLUID_SEARCH !== false;
      if (savedFluidSearch !== null) {
        setFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setFluidSearch(defaultFluidSearch);
      }
    }
  }, []);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await requestJson('/api/auth/sessions/current', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('注销请求失败:', error);
    }
    window.location.href = '/';
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleChangePassword = () => {
    setIsOpen(false);
    setIsChangePasswordOpen(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCloseChangePassword = () => {
    setIsChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSubmitChangePassword = async () => {
    setPasswordError('');

    // 验证密码
    if (!newPassword) {
      setPasswordError('新密码不得为空');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    setPasswordLoading(true);

    try {
      await requestJson('/api/users/current/password', {
        method: 'PATCH',
        body: JSON.stringify({
          newPassword,
        }),
      });

      // 修改成功，关闭弹窗并登出
      setIsChangePasswordOpen(false);
      await handleLogout();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  // 设置相关的处理函数
  const handleAggregateToggle = (value: boolean) => {
    setDefaultAggregateSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(value));
    }
  };

  const handleDoubanDataProxyModeChange = (value: ProxyMode) => {
    setDoubanDataProxyMode(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataProxyMode', value);
    }
  };

  const handleDoubanDataProxyPresetIdChange = (value: string) => {
    setDoubanDataProxyPresetId(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataProxyPresetId', value);
    }
  };

  const handleDoubanDataProxyCustomUrlChange = (value: string) => {
    setDoubanDataProxyCustomUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataProxyCustomUrl', value);
    }
  };

  const handleDoubanImageProxyModeChange = (value: ProxyMode) => {
    setDoubanImageProxyMode(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyMode', value);
    }
  };

  const handleDoubanImageProxyPresetIdChange = (value: string) => {
    setDoubanImageProxyPresetId(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyPresetId', value);
    }
  };

  const handleDoubanImageProxyCustomUrlChange = (value: string) => {
    setDoubanImageProxyCustomUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyCustomUrl', value);
    }
  };

  const handleFluidSearchToggle = (value: boolean) => {
    setFluidSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fluidSearch', JSON.stringify(value));
    }
  };

  const handleResetSettings = () => {
    const runtimeConfig = ((window as any).RUNTIME_CONFIG ||
      {}) as RuntimeConfig;
    const defaultDoubanDataProxyMode = normalizeMode(
      runtimeConfig.DOUBAN_DATA_PROXY_MODE,
    );
    const defaultDoubanDataProxyPresetId =
      runtimeConfig.DOUBAN_DATA_PROXY_PRESET_ID || '';
    const defaultDoubanDataProxyCustomUrl =
      runtimeConfig.DOUBAN_DATA_PROXY_CUSTOM_URL || '';
    const defaultDoubanImageProxyMode = normalizeMode(
      runtimeConfig.DOUBAN_IMAGE_PROXY_MODE,
    );
    const defaultDoubanImageProxyPresetId =
      runtimeConfig.DOUBAN_IMAGE_PROXY_PRESET_ID || '';
    const defaultDoubanImageProxyCustomUrl =
      runtimeConfig.DOUBAN_IMAGE_PROXY_CUSTOM_URL || '';
    const defaultFluidSearch = runtimeConfig.FLUID_SEARCH !== false;

    setDefaultAggregateSearch(true);
    setDoubanDataProxyMode(defaultDoubanDataProxyMode);
    setDoubanDataProxyPresetId(defaultDoubanDataProxyPresetId);
    setDoubanDataProxyCustomUrl(defaultDoubanDataProxyCustomUrl);
    setDoubanImageProxyMode(defaultDoubanImageProxyMode);
    setDoubanImageProxyPresetId(defaultDoubanImageProxyPresetId);
    setDoubanImageProxyCustomUrl(defaultDoubanImageProxyCustomUrl);
    setFluidSearch(defaultFluidSearch);

    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem('fluidSearch', JSON.stringify(defaultFluidSearch));
      localStorage.setItem('doubanDataProxyMode', defaultDoubanDataProxyMode);
      localStorage.setItem(
        'doubanDataProxyPresetId',
        defaultDoubanDataProxyPresetId,
      );
      localStorage.setItem(
        'doubanDataProxyCustomUrl',
        defaultDoubanDataProxyCustomUrl,
      );
      localStorage.setItem('doubanImageProxyMode', defaultDoubanImageProxyMode);
      localStorage.setItem(
        'doubanImageProxyPresetId',
        defaultDoubanImageProxyPresetId,
      );
      localStorage.setItem(
        'doubanImageProxyCustomUrl',
        defaultDoubanImageProxyCustomUrl,
      );
    }
  };

  // 检查是否显示管理面板按钮
  const showAdminPanel =
    authInfo?.role === 'owner' || authInfo?.role === 'admin';

  // 检查是否显示修改密码按钮（非站长用户可以修改密码）
  const showChangePassword = authInfo?.role !== 'owner';

  // 角色中文映射
  const getRoleText = (role?: string) => {
    switch (role) {
      case 'owner':
        return '站长';
      case 'admin':
        return '管理员';
      case 'user':
        return '用户';
      default:
        return '';
    }
  };

  // 菜单面板内容
  const menuPanel = (
    <>
      {/* 背景遮罩 - 普通菜单无需模糊 */}
      <div
        className='fixed inset-0 z-50 bg-transparent'
        onClick={handleCloseMenu}
      />

      {/* 菜单面板 */}
      <div className='bg-popover text-popover-foreground border-border/50 fixed right-4 top-14 z-50 w-56 select-none overflow-hidden rounded-lg border shadow-xl'>
        {/* 用户信息区域 */}
        <div className='border-border bg-muted/50 border-b px-3 py-2.5'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                当前用户
              </span>
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  (authInfo?.role || 'user') === 'owner'
                    ? 'bg-accent/10 text-accent'
                    : (authInfo?.role || 'user') === 'admin'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {getRoleText(authInfo?.role || 'user')}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='text-foreground truncate text-sm font-semibold'>
                {authInfo?.username || 'default'}
              </div>
              <div className='text-muted-foreground text-[10px]'>
                数据存储：SQLite
              </div>
            </div>
          </div>
        </div>

        {/* 菜单项 */}
        <div className='py-1'>
          {/* 设置按钮 */}
          <button
            onClick={handleSettings}
            className='text-foreground hover:bg-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
          >
            <Settings className='text-muted-foreground h-4 w-4' />
            <span className='font-medium'>设置</span>
          </button>

          {/* 管理面板按钮 */}
          {showAdminPanel && (
            <button
              onClick={handleAdminPanel}
              className='text-foreground hover:bg-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
            >
              <Shield className='text-muted-foreground h-4 w-4' />
              <span className='font-medium'>管理面板</span>
            </button>
          )}

          {/* 修改密码按钮 */}
          {showChangePassword && (
            <button
              onClick={handleChangePassword}
              className='text-foreground hover:bg-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
            >
              <KeyRound className='text-muted-foreground h-4 w-4' />
              <span className='font-medium'>修改密码</span>
            </button>
          )}

          {/* 分割线 */}
          <div className='border-border my-1 border-t'></div>

          {/* 登出按钮 */}
          <button
            onClick={handleLogout}
            className='text-destructive hover:bg-destructive/10 flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
          >
            <LogOut className='h-4 w-4' />
            <span className='font-medium'>登出</span>
          </button>
        </div>
      </div>
    </>
  );

  // 设置面板内容
  const settingsPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='bg-background/50 fixed inset-0 z-50 backdrop-blur-sm'
        onClick={handleCloseSettings}
        onTouchMove={(e) => {
          // 只阻止滚动，允许其他触摸事件
          e.preventDefault();
        }}
        onWheel={(e) => {
          // 阻止滚轮滚动
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 设置面板 */}
      <div className='bg-popover text-popover-foreground border-border fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl shadow-xl'>
        {/* 内容容器 - 独立的滚动区域 */}
        <div
          className='flex-1 overflow-y-auto p-6'
          data-panel-content
          style={{
            touchAction: 'pan-y', // 只允许垂直滚动
            overscrollBehavior: 'contain', // 防止滚动冒泡
          }}
        >
          {/* 标题栏 */}
          <div className='mb-6 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <h3 className='text-foreground text-xl font-bold'>本地设置</h3>
              <button
                onClick={handleResetSettings}
                className='text-destructive hover:text-destructive/80 border-destructive/20 hover:border-destructive/30 hover:bg-destructive/10 rounded border px-2 py-1 text-xs transition-colors'
                title='重置为默认设置'
              >
                恢复默认
              </button>
            </div>
            <button
              onClick={handleCloseSettings}
              className='text-muted-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full p-1 transition-colors'
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>

          {/* 设置项 */}
          <div className='space-y-6'>
            <div className='space-y-3'>
              <div>
                <label
                  htmlFor='usermenu-douban-data-mode'
                  className='text-foreground text-sm font-medium'
                >
                  豆瓣数据代理模式
                </label>
                <p className='text-muted-foreground mt-1 text-xs'>
                  数据代理支持服务端、预设池和自定义三种模式
                </p>
              </div>
              <select
                id='usermenu-douban-data-mode'
                className='border-border focus:ring-primary focus:border-primary bg-card text-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2'
                value={doubanDataProxyMode}
                onChange={(e) =>
                  handleDoubanDataProxyModeChange(
                    normalizeMode(e.target.value) as ProxyMode,
                  )
                }
              >
                <option value='server'>服务端代理</option>
                <option value='preset'>预设代理</option>
                <option value='custom'>自定义代理</option>
              </select>

              {doubanDataProxyMode === 'preset' && (
                <select
                  id='usermenu-douban-data-preset'
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2'
                  value={doubanDataProxyPresetId}
                  onChange={(e) =>
                    handleDoubanDataProxyPresetIdChange(e.target.value)
                  }
                >
                  <option value=''>请选择预设</option>
                  {doubanDataProxyPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name || preset.id}
                    </option>
                  ))}
                </select>
              )}

              {doubanDataProxyMode === 'custom' && (
                <input
                  id='usermenu-douban-data-custom-url'
                  type='text'
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2'
                  placeholder='例如: https://proxy.example.com/fetch?url='
                  value={doubanDataProxyCustomUrl}
                  onChange={(e) =>
                    handleDoubanDataProxyCustomUrlChange(e.target.value)
                  }
                />
              )}
            </div>

            <div className='border-border border-t'></div>

            <div className='space-y-3'>
              <div>
                <label
                  htmlFor='usermenu-douban-image-mode'
                  className='text-foreground text-sm font-medium'
                >
                  豆瓣图片代理模式
                </label>
                <p className='text-muted-foreground mt-1 text-xs'>
                  图片代理支持服务端、预设池和自定义三种模式
                </p>
              </div>
              <select
                id='usermenu-douban-image-mode'
                className='border-border focus:ring-primary focus:border-primary bg-card text-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2'
                value={doubanImageProxyMode}
                onChange={(e) =>
                  handleDoubanImageProxyModeChange(
                    normalizeMode(e.target.value) as ProxyMode,
                  )
                }
              >
                <option value='server'>服务端代理</option>
                <option value='preset'>预设代理</option>
                <option value='custom'>自定义代理</option>
              </select>

              {doubanImageProxyMode === 'preset' && (
                <select
                  id='usermenu-douban-image-preset'
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2'
                  value={doubanImageProxyPresetId}
                  onChange={(e) =>
                    handleDoubanImageProxyPresetIdChange(e.target.value)
                  }
                >
                  <option value=''>请选择预设</option>
                  {doubanImageProxyPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name || preset.id}
                    </option>
                  ))}
                </select>
              )}

              {doubanImageProxyMode === 'custom' && (
                <input
                  id='usermenu-douban-image-custom-url'
                  type='text'
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2'
                  placeholder='例如: https://proxy.example.com/fetch?url='
                  value={doubanImageProxyCustomUrl}
                  onChange={(e) =>
                    handleDoubanImageProxyCustomUrlChange(e.target.value)
                  }
                />
              )}
            </div>

            {/* 分割线 */}
            <div className='border-border border-t'></div>

            {/* 默认聚合搜索结果 */}
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='text-foreground text-sm font-medium'>
                  默认聚合搜索结果
                </h4>
                <p className='text-muted-foreground mt-1 text-xs'>
                  搜索时默认按标题和年份聚合显示结果
                </p>
              </div>
              <label className='flex cursor-pointer items-center'>
                <div className='relative'>
                  <input
                    type='checkbox'
                    className='peer sr-only'
                    checked={defaultAggregateSearch}
                    onChange={(e) => handleAggregateToggle(e.target.checked)}
                  />
                  <div className='bg-muted peer-checked:bg-primary h-6 w-11 rounded-full transition-colors'></div>
                  <div className='bg-card absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform peer-checked:translate-x-5'></div>
                </div>
              </label>
            </div>

            {/* 流式搜索 */}
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='text-foreground text-sm font-medium'>
                  流式搜索输出
                </h4>
                <p className='text-muted-foreground mt-1 text-xs'>
                  启用搜索结果实时流式输出，关闭后使用传统一次性搜索
                </p>
              </div>
              <label className='flex cursor-pointer items-center'>
                <div className='relative'>
                  <input
                    type='checkbox'
                    className='peer sr-only'
                    checked={fluidSearch}
                    onChange={(e) => handleFluidSearchToggle(e.target.checked)}
                  />
                  <div className='bg-muted peer-checked:bg-primary h-6 w-11 rounded-full transition-colors'></div>
                  <div className='bg-card absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform peer-checked:translate-x-5'></div>
                </div>
              </label>
            </div>
          </div>

          {/* 底部说明 */}
          <div className='border-border mt-6 border-t pt-4'>
            <p className='text-muted-foreground text-center text-xs'>
              这些设置保存在本地浏览器中
            </p>
          </div>
        </div>
      </div>
    </>
  );

  // 修改密码面板内容
  const changePasswordPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='bg-background/50 z-1000 fixed inset-0 backdrop-blur-sm'
        onClick={handleCloseChangePassword}
        onTouchMove={(e) => {
          // 只阻止滚动，允许其他触摸事件
          e.preventDefault();
        }}
        onWheel={(e) => {
          // 阻止滚轮滚动
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 修改密码面板 */}
      <div className='bg-popover text-popover-foreground border-border z-1001 fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-xl'>
        {/* 内容容器 - 独立的滚动区域 */}
        <div
          className='h-full p-6'
          data-panel-content
          onTouchMove={(e) => {
            // 阻止事件冒泡到遮罩层，但允许内部滚动
            e.stopPropagation();
          }}
          style={{
            touchAction: 'auto', // 允许所有触摸操作
          }}
        >
          {/* 标题栏 */}
          <div className='mb-6 flex items-center justify-between'>
            <h3 className='text-foreground text-xl font-bold'>修改密码</h3>
            <button
              onClick={handleCloseChangePassword}
              className='text-muted-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full p-1 transition-colors'
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>

          {/* 表单 */}
          <div className='space-y-4'>
            {/* 新密码输入 */}
            <div>
              <label className='text-foreground mb-2 block text-sm font-medium'>
                新密码
              </label>
              <input
                type='password'
                className='border-border focus:ring-primary bg-card text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2'
                placeholder='请输入新密码'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* 确认密码输入 */}
            <div>
              <label className='text-foreground mb-2 block text-sm font-medium'>
                确认密码
              </label>
              <input
                type='password'
                className='border-border focus:ring-primary bg-card text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2'
                placeholder='请再次输入新密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* 错误信息 */}
            {passwordError && (
              <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm'>
                {passwordError}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className='border-border mt-6 flex gap-3 border-t pt-4'>
            <button
              onClick={handleCloseChangePassword}
              className='text-foreground bg-muted hover:bg-muted/80 flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors'
              disabled={passwordLoading}
            >
              取消
            </button>
            <button
              onClick={handleSubmitChangePassword}
              className='text-primary-foreground bg-primary hover:bg-primary/90 flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
              disabled={passwordLoading || !newPassword || !confirmPassword}
            >
              {passwordLoading ? '修改中...' : '确认修改'}
            </button>
          </div>

          {/* 底部说明 */}
          <div className='border-border mt-4 border-t pt-4'>
            <p className='text-muted-foreground text-center text-xs'>
              修改密码后需要重新登录
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <UserMenuContainer
      isOpen={isOpen}
      mounted={mounted}
      isSettingsOpen={isSettingsOpen}
      isChangePasswordOpen={isChangePasswordOpen}
      onToggleMenu={handleMenuClick}
      menuPanel={menuPanel}
      settingsPanel={settingsPanel}
      changePasswordPanel={changePasswordPanel}
    />
  );
};
