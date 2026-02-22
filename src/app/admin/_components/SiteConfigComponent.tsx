/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';

import { AdminConfig, SiteConfig } from '@/lib/admin.types';
import { ChevronDown, Check } from 'lucide-react';
import { AlertModal, showError, showSuccess, useAlertModal } from './AlertModal';
import { buttonStyles } from './buttonStyles';
import { useLoadingState } from './LoadingSystem';

// 新增站点配置组件
export const SiteConfigComponent = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [siteSettings, setSiteSettings] = useState<SiteConfig>({
    SiteName: '',
    Announcement: '',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    DoubanDataCacheTime: 7200,
    DoubanProxyType: 'server',
    DoubanProxy: '',
    DoubanImageProxyType: 'server',
    DoubanImageProxy: '',
    DisableYellowFilter: false,
    FluidSearch: true,
    EnableRegistration: false,
  });

  // 豆瓣数据源相关状态
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

  useEffect(() => {
    if (config?.SiteConfig) {
      setSiteSettings({
        ...config.SiteConfig,
        DoubanProxyType: config.SiteConfig.DoubanProxyType || 'server',
        DoubanProxy: config.SiteConfig.DoubanProxy || '',
        DoubanImageProxyType:
          config.SiteConfig.DoubanImageProxyType || 'server',
        DoubanImageProxy: config.SiteConfig.DoubanImageProxy || '',
        DisableYellowFilter: config.SiteConfig.DisableYellowFilter || false,
        FluidSearch: config.SiteConfig.FluidSearch || true,
        EnableRegistration: config.SiteConfig.EnableRegistration || false,
      });
    }
  }, [config]);

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

  // 处理豆瓣数据源变化
  const handleDoubanDataSourceChange = (value: string) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanProxyType: value,
    }));
  };

  // 处理豆瓣图片代理变化
  const handleDoubanImageProxyChange = (value: string) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanImageProxyType: value,
    }));
  };

  // 保存站点配置
  const handleSave = async () => {
    await withLoading('saveSiteConfig', async () => {
      try {
        const resp = await fetch('/api/admin/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...siteSettings }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `保存失败: ${resp.status}`);
        }

        showSuccess('保存成功, 请刷新页面', showAlert);
        await refreshConfig();
      } catch (err) {
        showError(err instanceof Error ? err.message : '保存失败', showAlert);
        throw err;
      }
    });
  };

  if (!config) {
    return <div className='text-muted-foreground text-center'>加载中...</div>;
  }

  return (
    <div className='space-y-6'>
      {/* 站点名称 */}
      <div>
        <label className='text-foreground mb-2 block text-sm font-medium'>
          站点名称
        </label>
        <input
          type='text'
          value={siteSettings.SiteName}
          onChange={(e) =>
            setSiteSettings((prev) => ({ ...prev, SiteName: e.target.value }))
          }
          className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2'
        />
      </div>

      {/* 站点公告 */}
      <div>
        <label className='text-foreground mb-2 block text-sm font-medium'>
          站点公告
        </label>
        <textarea
          value={siteSettings.Announcement}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              Announcement: e.target.value,
            }))
          }
          rows={3}
          className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2'
        />
      </div>

      {/* 豆瓣数据源设置 */}
      <div className='space-y-3'>
        <div>
          <label className='text-foreground mb-2 block text-sm font-medium'>
            豆瓣数据代理
          </label>
          <div className='relative' data-dropdown='douban-datasource'>
            {/* 自定义下拉选择框 */}
            <button
              type='button'
              onClick={() => setIsDoubanDropdownOpen(!isDoubanDropdownOpen)}
              className='border-border bg-card text-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 pr-10 text-left text-sm shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
            >
              {
                doubanDataSourceOptions.find(
                  (option) => option.value === siteSettings.DoubanProxyType,
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
                      siteSettings.DoubanProxyType === option.value
                        ? 'bg-success/10 text-success'
                        : 'text-foreground'
                    }`}
                  >
                    <span className='truncate'>{option.label}</span>
                    {siteSettings.DoubanProxyType === option.value && (
                      <Check className='text-success ml-2 h-4 w-4 shrink-0' />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>
            选择获取豆瓣数据的方式
          </p>
        </div>

        {/* 豆瓣代理地址设置 - 仅在选择自定义代理时显示 */}
        {siteSettings.DoubanProxyType === 'custom' && (
          <div>
            <label className='text-foreground mb-2 block text-sm font-medium'>
              豆瓣代理地址
            </label>
            <input
              type='text'
              placeholder='例如: https://proxy.example.com/fetch?url='
              value={siteSettings.DoubanProxy}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanProxy: e.target.value,
                }))
              }
              className='border-border bg-card text-foreground placeholder:text-muted-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
            />
            <p className='text-muted-foreground mt-1 text-xs'>
              自定义代理服务器地址
            </p>
          </div>
        )}
      </div>

      {/* 豆瓣图片代理设置 */}
      <div className='space-y-3'>
        <div>
          <label className='text-foreground mb-2 block text-sm font-medium'>
            豆瓣图片代理
          </label>
          <div className='relative' data-dropdown='douban-image-proxy'>
            {/* 自定义下拉选择框 */}
            <button
              type='button'
              onClick={() =>
                setIsDoubanImageProxyDropdownOpen(
                  !isDoubanImageProxyDropdownOpen,
                )
              }
              className='border-border bg-card text-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 pr-10 text-left text-sm shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
            >
              {
                doubanImageProxyTypeOptions.find(
                  (option) =>
                    option.value === siteSettings.DoubanImageProxyType,
                )?.label
              }
            </button>

            {/* 下拉箭头 */}
            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${
                  isDoubanImageProxyDropdownOpen ? 'rotate-180' : ''
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
                      handleDoubanImageProxyChange(option.value);
                      setIsDoubanImageProxyDropdownOpen(false);
                    }}
                    className={`hover:bg-muted flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      siteSettings.DoubanImageProxyType === option.value
                        ? 'bg-success/10 text-success'
                        : 'text-foreground'
                    }`}
                  >
                    <span className='truncate'>{option.label}</span>
                    {siteSettings.DoubanImageProxyType === option.value && (
                      <Check className='text-success ml-2 h-4 w-4 shrink-0' />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>
            选择获取豆瓣图片的方式
          </p>
        </div>

        {/* 豆瓣代理地址设置 - 仅在选择自定义代理时显示 */}
        {siteSettings.DoubanImageProxyType === 'custom' && (
          <div>
            <label className='text-foreground mb-2 block text-sm font-medium'>
              豆瓣图片代理地址
            </label>
            <input
              type='text'
              placeholder='例如: https://proxy.example.com/fetch?url='
              value={siteSettings.DoubanImageProxy}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanImageProxy: e.target.value,
                }))
              }
              className='border-border bg-card text-foreground placeholder:text-muted-foreground hover:border-border/80 w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
            />
            <p className='text-muted-foreground mt-1 text-xs'>
              自定义图片代理服务器地址
            </p>
          </div>
        )}
      </div>

      {/* 强调色设置 */}

      {/* 搜索接口可拉取最大页数 */}
      <div>
        <label className='text-foreground mb-2 block text-sm font-medium'>
          搜索接口可拉取最大页数
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SearchDownstreamMaxPage}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SearchDownstreamMaxPage: Number(e.target.value),
            }))
          }
          className='border-border bg-card text-foreground w-full rounded-lg border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
        />
      </div>

      {/* 站点接口缓存时间 */}
      <div>
        <label className='text-foreground mb-2 block text-sm font-medium'>
          站点接口缓存时间（秒）
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SiteInterfaceCacheTime}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SiteInterfaceCacheTime: Number(e.target.value),
            }))
          }
          className='border-border bg-card text-foreground w-full rounded-lg border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
        />
      </div>

      {/* 豆瓣数据缓存时间 */}
      <div>
        <label className='text-foreground mb-2 block text-sm font-medium'>
          豆瓣数据缓存时间（秒）
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.DoubanDataCacheTime}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              DoubanDataCacheTime: Number(e.target.value),
            }))
          }
          className='border-border bg-card text-foreground w-full rounded-lg border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary'
        />
      </div>

      {/* 禁用黄色过滤器 */}
      <div>
        <div className='flex items-center justify-between'>
          <label className='text-foreground mb-2 block text-sm font-medium'>
            禁用黄色过滤器
          </label>
          <button
            type='button'
            onClick={() =>
              setSiteSettings((prev) => ({
                ...prev,
                DisableYellowFilter: !prev.DisableYellowFilter,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              siteSettings.DisableYellowFilter
                ? buttonStyles.toggleOn
                : buttonStyles.toggleOff
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full ${buttonStyles.toggleThumb} transition-transform ${
                siteSettings.DisableYellowFilter
                  ? buttonStyles.toggleThumbOn
                  : buttonStyles.toggleThumbOff
              }`}
            />
          </button>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>
          禁用黄色内容的过滤功能，允许显示所有内容。
        </p>
      </div>

      {/* 流式搜索 */}
      <div>
        <div className='flex items-center justify-between'>
          <label className='text-foreground mb-2 block text-sm font-medium'>
            启用流式搜索
          </label>
          <button
            type='button'
            onClick={() =>
              setSiteSettings((prev) => ({
                ...prev,
                FluidSearch: !prev.FluidSearch,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              siteSettings.FluidSearch
                ? buttonStyles.toggleOn
                : buttonStyles.toggleOff
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full ${buttonStyles.toggleThumb} transition-transform ${
                siteSettings.FluidSearch
                  ? buttonStyles.toggleThumbOn
                  : buttonStyles.toggleThumbOff
              }`}
            />
          </button>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>
          启用后搜索结果将实时流式返回，提升用户体验。
        </p>
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-end'>
        <button
          onClick={handleSave}
          disabled={isLoading('saveSiteConfig')}
          className={`px-4 py-2 ${
            isLoading('saveSiteConfig')
              ? buttonStyles.disabled
             : buttonStyles.primary
          } rounded-lg transition-colors`}
        >
          {isLoading('saveSiteConfig') ? '保存中…' : '保存'}
        </button>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};