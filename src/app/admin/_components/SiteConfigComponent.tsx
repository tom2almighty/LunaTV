/* eslint-disable no-console, @typescript-eslint/no-non-null-assertion */
'use client';

import { useEffect, useState } from 'react';

import {
  AdminConfig,
  DoubanProxyMode,
  DoubanProxyPreset,
  SiteConfig,
} from '@/lib/admin.types';

import {
  AlertModal,
  showError,
  showSuccess,
  useAlertModal,
} from './AlertModal';
import { buttonStyles } from './buttonStyles';
import { useLoadingState } from './LoadingSystem';

const PROXY_MODE_OPTIONS: Array<{ value: DoubanProxyMode; label: string }> = [
  { value: 'server', label: '服务端代理' },
  { value: 'preset', label: '预设代理池' },
  { value: 'custom', label: '自定义代理' },
];

const createPreset = (): DoubanProxyPreset => ({
  id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  url: '',
});

const normalizeMode = (mode: unknown): DoubanProxyMode => {
  if (mode === 'server' || mode === 'preset' || mode === 'custom') {
    return mode;
  }
  return 'server';
};

const normalizePresets = (presets: unknown): DoubanProxyPreset[] => {
  if (!Array.isArray(presets)) {
    return [];
  }
  return presets
    .filter(
      (preset): preset is DoubanProxyPreset =>
        typeof preset === 'object' &&
        preset !== null &&
        typeof preset.id === 'string' &&
        typeof preset.name === 'string' &&
        typeof preset.url === 'string',
    )
    .map((preset) => ({
      id: preset.id || createPreset().id,
      name: preset.name,
      url: preset.url,
    }));
};

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
  });

  useEffect(() => {
    if (!config?.SiteConfig) {
      return;
    }

    setSiteSettings({
      ...config.SiteConfig,
      DoubanDataProxyMode: normalizeMode(config.SiteConfig.DoubanDataProxyMode),
      DoubanDataProxyPresetId: config.SiteConfig.DoubanDataProxyPresetId || '',
      DoubanDataProxyCustomUrl:
        config.SiteConfig.DoubanDataProxyCustomUrl || '',
      DoubanDataProxyPresets: normalizePresets(
        config.SiteConfig.DoubanDataProxyPresets,
      ),
      DoubanImageProxyMode: normalizeMode(
        config.SiteConfig.DoubanImageProxyMode,
      ),
      DoubanImageProxyPresetId:
        config.SiteConfig.DoubanImageProxyPresetId || '',
      DoubanImageProxyCustomUrl:
        config.SiteConfig.DoubanImageProxyCustomUrl || '',
      DoubanImageProxyPresets: normalizePresets(
        config.SiteConfig.DoubanImageProxyPresets,
      ),
      DisableYellowFilter: Boolean(config.SiteConfig.DisableYellowFilter),
      FluidSearch: config.SiteConfig.FluidSearch !== false,
      EnableRegistration: Boolean(config.SiteConfig.EnableRegistration),
      M3U8AdFilterEnabled: config.SiteConfig.M3U8AdFilterEnabled !== false,
    });
  }, [config]);

  const addDataPreset = () => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanDataProxyPresets: [...prev.DoubanDataProxyPresets, createPreset()],
    }));
  };

  const addImagePreset = () => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanImageProxyPresets: [
        ...prev.DoubanImageProxyPresets,
        createPreset(),
      ],
    }));
  };

  const updateDataPreset = (
    index: number,
    patch: Partial<Pick<DoubanProxyPreset, 'name' | 'url'>>,
  ) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanDataProxyPresets: prev.DoubanDataProxyPresets.map((preset, i) =>
        i === index ? { ...preset, ...patch } : preset,
      ),
    }));
  };

  const updateImagePreset = (
    index: number,
    patch: Partial<Pick<DoubanProxyPreset, 'name' | 'url'>>,
  ) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanImageProxyPresets: prev.DoubanImageProxyPresets.map((preset, i) =>
        i === index ? { ...preset, ...patch } : preset,
      ),
    }));
  };

  const removeDataPreset = (index: number) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanDataProxyPresets: prev.DoubanDataProxyPresets.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const removeImagePreset = (index: number) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanImageProxyPresets: prev.DoubanImageProxyPresets.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleSave = async () => {
    await withLoading('saveSiteConfig', async () => {
      try {
        const resp = await fetch('/api/admin/settings/site', {
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

      <section className='space-y-3'>
        <label
          htmlFor='doubanDataProxyMode'
          className='text-foreground block text-sm font-medium'
        >
          豆瓣数据代理模式
        </label>
        <select
          id='doubanDataProxyMode'
          value={siteSettings.DoubanDataProxyMode}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              DoubanDataProxyMode: normalizeMode(e.target.value),
            }))
          }
          className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:ring-2'
        >
          {PROXY_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {siteSettings.DoubanDataProxyMode === 'preset' && (
          <div>
            <label
              htmlFor='doubanDataProxyPresetId'
              className='text-foreground mb-2 block text-sm font-medium'
            >
              豆瓣数据代理预设
            </label>
            <select
              id='doubanDataProxyPresetId'
              value={siteSettings.DoubanDataProxyPresetId}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanDataProxyPresetId: e.target.value,
                }))
              }
              className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:ring-2'
            >
              <option value=''>请选择预设</option>
              {siteSettings.DoubanDataProxyPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name || preset.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {siteSettings.DoubanDataProxyMode === 'custom' && (
          <div>
            <label
              htmlFor='doubanDataProxyCustomUrl'
              className='text-foreground mb-2 block text-sm font-medium'
            >
              豆瓣数据代理自定义地址
            </label>
            <input
              id='doubanDataProxyCustomUrl'
              type='text'
              value={siteSettings.DoubanDataProxyCustomUrl}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanDataProxyCustomUrl: e.target.value,
                }))
              }
              placeholder='例如: https://proxy.example.com/fetch?url='
              className='border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:ring-2'
            />
          </div>
        )}

        <div className='border-border space-y-3 rounded-lg border p-3'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-medium'>数据代理预设池</h4>
            <button
              type='button'
              className={buttonStyles.secondary}
              onClick={addDataPreset}
            >
              新增数据预设
            </button>
          </div>
          {siteSettings.DoubanDataProxyPresets.map((preset, index) => (
            <div
              key={preset.id}
              className='bg-muted/30 border-border space-y-2 rounded-lg border p-3'
            >
              <label
                htmlFor={`dataPresetName-${index}`}
                className='text-foreground block text-sm font-medium'
              >
                {`数据预设名称-${index + 1}`}
              </label>
              <input
                id={`dataPresetName-${index}`}
                type='text'
                value={preset.name}
                onChange={(e) =>
                  updateDataPreset(index, { name: e.target.value })
                }
                className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2'
              />
              <label
                htmlFor={`dataPresetUrl-${index}`}
                className='text-foreground block text-sm font-medium'
              >
                {`数据预设地址-${index + 1}`}
              </label>
              <input
                id={`dataPresetUrl-${index}`}
                type='text'
                value={preset.url}
                onChange={(e) =>
                  updateDataPreset(index, { url: e.target.value })
                }
                className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2'
              />
              <button
                type='button'
                onClick={() => removeDataPreset(index)}
                className={buttonStyles.danger}
              >
                {`删除数据预设-${index + 1}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className='space-y-3'>
        <label
          htmlFor='doubanImageProxyMode'
          className='text-foreground block text-sm font-medium'
        >
          豆瓣图片代理模式
        </label>
        <select
          id='doubanImageProxyMode'
          value={siteSettings.DoubanImageProxyMode}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              DoubanImageProxyMode: normalizeMode(e.target.value),
            }))
          }
          className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:ring-2'
        >
          {PROXY_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {siteSettings.DoubanImageProxyMode === 'preset' && (
          <div>
            <label
              htmlFor='doubanImageProxyPresetId'
              className='text-foreground mb-2 block text-sm font-medium'
            >
              豆瓣图片代理预设
            </label>
            <select
              id='doubanImageProxyPresetId'
              value={siteSettings.DoubanImageProxyPresetId}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanImageProxyPresetId: e.target.value,
                }))
              }
              className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:ring-2'
            >
              <option value=''>请选择预设</option>
              {siteSettings.DoubanImageProxyPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name || preset.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {siteSettings.DoubanImageProxyMode === 'custom' && (
          <div>
            <label
              htmlFor='doubanImageProxyCustomUrl'
              className='text-foreground mb-2 block text-sm font-medium'
            >
              豆瓣图片代理自定义地址
            </label>
            <input
              id='doubanImageProxyCustomUrl'
              type='text'
              value={siteSettings.DoubanImageProxyCustomUrl}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanImageProxyCustomUrl: e.target.value,
                }))
              }
              placeholder='例如: https://proxy.example.com/fetch?url='
              className='border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:ring-2'
            />
          </div>
        )}

        <div className='border-border space-y-3 rounded-lg border p-3'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-medium'>图片代理预设池</h4>
            <button
              type='button'
              className={buttonStyles.secondary}
              onClick={addImagePreset}
            >
              新增图片预设
            </button>
          </div>
          {siteSettings.DoubanImageProxyPresets.map((preset, index) => (
            <div
              key={preset.id}
              className='bg-muted/30 border-border space-y-2 rounded-lg border p-3'
            >
              <label
                htmlFor={`imagePresetName-${index}`}
                className='text-foreground block text-sm font-medium'
              >
                {`图片预设名称-${index + 1}`}
              </label>
              <input
                id={`imagePresetName-${index}`}
                type='text'
                value={preset.name}
                onChange={(e) =>
                  updateImagePreset(index, { name: e.target.value })
                }
                className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2'
              />
              <label
                htmlFor={`imagePresetUrl-${index}`}
                className='text-foreground block text-sm font-medium'
              >
                {`图片预设地址-${index + 1}`}
              </label>
              <input
                id={`imagePresetUrl-${index}`}
                type='text'
                value={preset.url}
                onChange={(e) =>
                  updateImagePreset(index, { url: e.target.value })
                }
                className='border-border bg-card text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2'
              />
              <button
                type='button'
                onClick={() => removeImagePreset(index)}
                className={buttonStyles.danger}
              >
                {`删除图片预设-${index + 1}`}
              </button>
            </div>
          ))}
        </div>
      </section>

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
          className='border-border bg-card text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2'
        />
      </div>

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
          className='border-border bg-card text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2'
        />
      </div>

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
          className='border-border bg-card text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2'
        />
      </div>

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
            className={`focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
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
      </div>

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
            className={`focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
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
      </div>

      <div>
        <div className='flex items-center justify-between'>
          <label className='text-foreground mb-2 block text-sm font-medium'>
            启用 m3u8 广告过滤
          </label>
          <button
            type='button'
            onClick={() =>
              setSiteSettings((prev) => ({
                ...prev,
                M3U8AdFilterEnabled: !prev.M3U8AdFilterEnabled,
              }))
            }
            className={`focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              siteSettings.M3U8AdFilterEnabled
                ? buttonStyles.toggleOn
                : buttonStyles.toggleOff
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full ${buttonStyles.toggleThumb} transition-transform ${
                siteSettings.M3U8AdFilterEnabled
                  ? buttonStyles.toggleThumbOn
                  : buttonStyles.toggleThumbOff
              }`}
            />
          </button>
        </div>
      </div>

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
