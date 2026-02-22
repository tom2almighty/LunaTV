/* eslint-disable no-console,@typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

'use client';

import {
  Check,
  ChevronDown,
  ExternalLink,
  KeyRound,
  LogOut,
  Settings,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

export const UserMenu: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
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
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('');

  const [fluidSearch, setFluidSearch] = useState(true);
  const [doubanDataSource, setDoubanDataSource] = useState('server');
  const [doubanImageProxyType, setDoubanImageProxyType] = useState('server');
  const [doubanImageProxyUrl, setDoubanImageProxyUrl] = useState('');
  const [isDoubanDropdownOpen, setIsDoubanDropdownOpen] = useState(false);
  const [isDoubanImageProxyDropdownOpen, setIsDoubanImageProxyDropdownOpen] =
    useState(false);

  // 豆瓣数据源选项（简化为服务端代理和自定义代理）
  const doubanDataSourceOptions = [
    { value: 'server', label: '服务端代理（服务器直接请求豆瓣）' },
    { value: 'custom', label: '自定义代理' },
  ];

  // 豆瓣图片代理选项（简化为服务端代理和自定义代理）
  const doubanImageProxyTypeOptions = [
    { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
    { value: 'custom', label: '自定义代理' },
  ];

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
    if (typeof window !== 'undefined') {
      const auth = getAuthInfoFromBrowserCookie();
      setAuthInfo(auth);
    }
  }, []);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAggregateSearch = localStorage.getItem(
        'defaultAggregateSearch',
      );
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      const savedDoubanDataSource = localStorage.getItem('doubanDataSource');
      const defaultDoubanProxyType =
        (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
        'cmliussss-cdn-tencent';
      if (savedDoubanDataSource !== null) {
        setDoubanDataSource(savedDoubanDataSource);
      } else if (defaultDoubanProxyType) {
        setDoubanDataSource(defaultDoubanProxyType);
      }

      const savedDoubanProxyUrl = localStorage.getItem('doubanProxyUrl');
      const defaultDoubanProxy =
        (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '';
      if (savedDoubanProxyUrl !== null) {
        setDoubanProxyUrl(savedDoubanProxyUrl);
      } else if (defaultDoubanProxy) {
        setDoubanProxyUrl(defaultDoubanProxy);
      }

      const savedDoubanImageProxyType = localStorage.getItem(
        'doubanImageProxyType',
      );
      const defaultDoubanImageProxyType =
        (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
        'cmliussss-cdn-tencent';
      if (savedDoubanImageProxyType !== null) {
        setDoubanImageProxyType(savedDoubanImageProxyType);
      } else if (defaultDoubanImageProxyType) {
        setDoubanImageProxyType(defaultDoubanImageProxyType);
      }

      const savedDoubanImageProxyUrl = localStorage.getItem(
        'doubanImageProxyUrl',
      );
      const defaultDoubanImageProxyUrl =
        (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY || '';
      if (savedDoubanImageProxyUrl !== null) {
        setDoubanImageProxyUrl(savedDoubanImageProxyUrl);
      } else if (defaultDoubanImageProxyUrl) {
        setDoubanImageProxyUrl(defaultDoubanImageProxyUrl);
      }

      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch =
        (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
      if (savedFluidSearch !== null) {
        setFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setFluidSearch(defaultFluidSearch);
      }
    }
  }, []);

  // 点击外部区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-datasource"]')) {
          setIsDoubanDropdownOpen(false);
        }
      }
    };

    if (isDoubanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanImageProxyDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-image-proxy"]')) {
          setIsDoubanImageProxyDropdownOpen(false);
        }
      }
    };

    if (isDoubanImageProxyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanImageProxyDropdownOpen]);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || '修改密码失败');
        return;
      }

      // 修改成功，关闭弹窗并登出
      setIsChangePasswordOpen(false);
      await handleLogout();
    } catch (error) {
      setPasswordError('网络错误，请稍后重试');
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

  const handleDoubanProxyUrlChange = (value: string) => {
    setDoubanProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrl', value);
    }
  };

  const handleFluidSearchToggle = (value: boolean) => {
    setFluidSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fluidSearch', JSON.stringify(value));
    }
  };

  const handleDoubanDataSourceChange = (value: string) => {
    setDoubanDataSource(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataSource', value);
    }
  };

  const handleDoubanImageProxyTypeChange = (value: string) => {
    setDoubanImageProxyType(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyType', value);
    }
  };

  const handleDoubanImageProxyUrlChange = (value: string) => {
    setDoubanImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyUrl', value);
    }
  };

  // 获取感谢信息
  const getThanksInfo = (dataSource: string) => {
    switch (dataSource) {
      case 'cors-proxy-zwei':
        return {
          text: 'Thanks to @Zwei',
          url: 'https://github.com/bestzwei',
        };
      case 'cmliussss-cdn-tencent':
      case 'cmliussss-cdn-ali':
        return {
          text: 'Thanks to @CMLiussss',
          url: 'https://github.com/cmliu',
        };
      default:
        return null;
    }
  };

  const handleResetSettings = () => {
    const defaultDoubanProxyType =
      (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
      'cmliussss-cdn-tencent';
    const defaultDoubanProxy =
      (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '';
    const defaultDoubanImageProxyType =
      (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
      'cmliussss-cdn-tencent';
    const defaultDoubanImageProxyUrl =
      (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY || '';
    const defaultFluidSearch =
      (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;

    setDefaultAggregateSearch(true);

    setFluidSearch(defaultFluidSearch);
    setDoubanProxyUrl(defaultDoubanProxy);
    setDoubanDataSource(defaultDoubanProxyType);
    setDoubanImageProxyType(defaultDoubanImageProxyType);
    setDoubanImageProxyUrl(defaultDoubanImageProxyUrl);

    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem('fluidSearch', JSON.stringify(defaultFluidSearch));
      localStorage.setItem('doubanProxyUrl', defaultDoubanProxy);
      localStorage.setItem('doubanDataSource', defaultDoubanProxyType);
      localStorage.setItem('doubanImageProxyType', defaultDoubanImageProxyType);
      localStorage.setItem('doubanImageProxyUrl', defaultDoubanImageProxyUrl);
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
            className='flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10'
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
            {/* 豆瓣数据源选择 */}
            <div className='space-y-3'>
              <div>
                <h4 className='text-foreground text-sm font-medium'>
                  豆瓣数据代理
                </h4>
                <p className='text-muted-foreground mt-1 text-xs'>
                  选择获取豆瓣数据的方式
                </p>
              </div>
              <div className='relative' data-dropdown='douban-datasource'>
                {/* 自定义下拉选择框 */}
                <button
                  type='button'
                  onClick={() => setIsDoubanDropdownOpen(!isDoubanDropdownOpen)}
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 pr-10 text-left text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2'
                >
                  {
                    doubanDataSourceOptions.find(
                      (option) => option.value === doubanDataSource,
                    )?.label
                  }
                </button>

                {/* 下拉箭头 */}
                <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
                  <ChevronDown
                    className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${
                      isDoubanDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* 下拉选项列表 */}
                {isDoubanDropdownOpen && (
                  <div className='bg-card border-border absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg'>
                    {doubanDataSourceOptions.map((option) => (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => {
                          handleDoubanDataSourceChange(option.value);
                          setIsDoubanDropdownOpen(false);
                        }}
                        className={`hover:bg-muted flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                          doubanDataSource === option.value
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        <span className='truncate'>{option.label}</span>
                        {doubanDataSource === option.value && (
                          <Check className='text-primary ml-2 h-4 w-4 shrink-0' />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 感谢信息 */}
              {getThanksInfo(doubanDataSource) && (
                <div className='mt-3'>
                  <button
                    type='button'
                    onClick={() =>
                      window.open(
                        getThanksInfo(doubanDataSource)!.url,
                        '_blank',
                      )
                    }
                    className='text-muted-foreground flex w-full cursor-pointer items-center justify-center gap-1.5 px-3 text-xs'
                  >
                    <span className='font-medium'>
                      {getThanksInfo(doubanDataSource)!.text}
                    </span>
                    <ExternalLink className='w-3.5 opacity-70' />
                  </button>
                </div>
              )}
            </div>

            {/* 豆瓣代理地址设置 - 仅在选择自定义代理时显示 */}
            {doubanDataSource === 'custom' && (
              <div className='space-y-3'>
                <div>
                  <h4 className='text-foreground text-sm font-medium'>
                    豆瓣代理地址
                  </h4>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    自定义代理服务器地址
                  </p>
                </div>
                <input
                  type='text'
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground placeholder:text-muted-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2'
                  placeholder='例如: https://proxy.example.com/fetch?url='
                  value={doubanProxyUrl}
                  onChange={(e) => handleDoubanProxyUrlChange(e.target.value)}
                />
              </div>
            )}

            {/* 分割线 */}
            <div className='border-border border-t'></div>

            {/* 豆瓣图片代理设置 */}
            <div className='space-y-3'>
              <div>
                <h4 className='text-foreground text-sm font-medium'>
                  豆瓣图片代理
                </h4>
                <p className='text-muted-foreground mt-1 text-xs'>
                  选择获取豆瓣图片的方式
                </p>
              </div>
              <div className='relative' data-dropdown='douban-image-proxy'>
                {/* 自定义下拉选择框 */}
                <button
                  type='button'
                  onClick={() =>
                    setIsDoubanImageProxyDropdownOpen(
                      !isDoubanImageProxyDropdownOpen,
                    )
                  }
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 pr-10 text-left text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2'
                >
                  {
                    doubanImageProxyTypeOptions.find(
                      (option) => option.value === doubanImageProxyType,
                    )?.label
                  }
                </button>

                {/* 下拉箭头 */}
                <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
                  <ChevronDown
                    className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${
                      isDoubanDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* 下拉选项列表 */}
                {isDoubanImageProxyDropdownOpen && (
                  <div className='bg-card border-border absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg'>
                    {doubanImageProxyTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => {
                          handleDoubanImageProxyTypeChange(option.value);
                          setIsDoubanImageProxyDropdownOpen(false);
                        }}
                        className={`hover:bg-muted flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                          doubanImageProxyType === option.value
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        <span className='truncate'>{option.label}</span>
                        {doubanImageProxyType === option.value && (
                          <Check className='text-primary ml-2 h-4 w-4 shrink-0' />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 感谢信息 */}
              {getThanksInfo(doubanImageProxyType) && (
                <div className='mt-3'>
                  <button
                    type='button'
                    onClick={() =>
                      window.open(
                        getThanksInfo(doubanImageProxyType)!.url,
                        '_blank',
                      )
                    }
                    className='text-muted-foreground flex w-full cursor-pointer items-center justify-center gap-1.5 px-3 text-xs'
                  >
                    <span className='font-medium'>
                      {getThanksInfo(doubanImageProxyType)!.text}
                    </span>
                    <ExternalLink className='w-3.5 opacity-70' />
                  </button>
                </div>
              )}
            </div>

            {/* 豆瓣图片代理地址设置 - 仅在选择自定义代理时显示 */}
            {doubanImageProxyType === 'custom' && (
              <div className='space-y-3'>
                <div>
                  <h4 className='text-foreground text-sm font-medium'>
                    豆瓣图片代理地址
                  </h4>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    自定义图片代理服务器地址
                  </p>
                </div>
                <input
                  type='text'
                  className='border-border focus:ring-primary focus:border-primary bg-card text-foreground placeholder:text-muted-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2'
                  placeholder='例如: https://proxy.example.com/fetch?url='
                  value={doubanImageProxyUrl}
                  onChange={(e) =>
                    handleDoubanImageProxyUrlChange(e.target.value)
                  }
                />
              </div>
            )}

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
              <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
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
    <>
      <div className='relative'>
        <button
          onClick={handleMenuClick}
          className='text-muted-foreground hover:bg-muted/50 flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors'
          aria-label='User Menu'
        >
          <User className='h-full w-full' />
        </button>
      </div>

      {/* 使用 Portal 将菜单面板渲染到 document.body */}
      {isOpen && mounted && createPortal(menuPanel, document.body)}

      {/* 使用 Portal 将设置面板渲染到 document.body */}
      {isSettingsOpen && mounted && createPortal(settingsPanel, document.body)}

      {/* 使用 Portal 将修改密码面板渲染到 document.body */}
      {isChangePasswordOpen &&
        mounted &&
        createPortal(changePasswordPanel, document.body)}
    </>
  );
};
