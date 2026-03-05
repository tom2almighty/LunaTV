import type { SiteConfig } from '@/lib/admin.types';

export type RuntimeConfig = {
  DOUBAN_DATA_PROXY_MODE: SiteConfig['DoubanDataProxyMode'];
  DOUBAN_DATA_PROXY_PRESET_ID: string;
  DOUBAN_DATA_PROXY_CUSTOM_URL: string;
  DOUBAN_DATA_PROXY_PRESETS: SiteConfig['DoubanDataProxyPresets'];
  DOUBAN_IMAGE_PROXY_MODE: SiteConfig['DoubanImageProxyMode'];
  DOUBAN_IMAGE_PROXY_PRESET_ID: string;
  DOUBAN_IMAGE_PROXY_CUSTOM_URL: string;
  DOUBAN_IMAGE_PROXY_PRESETS: SiteConfig['DoubanImageProxyPresets'];
  DISABLE_YELLOW_FILTER: boolean;
  FLUID_SEARCH: boolean;
  M3U8_AD_FILTER_ENABLED: boolean;
};

export function buildRuntimeConfig(siteConfig: SiteConfig): RuntimeConfig {
  return {
    DOUBAN_DATA_PROXY_MODE: siteConfig.DoubanDataProxyMode,
    DOUBAN_DATA_PROXY_PRESET_ID: siteConfig.DoubanDataProxyPresetId,
    DOUBAN_DATA_PROXY_CUSTOM_URL: siteConfig.DoubanDataProxyCustomUrl,
    DOUBAN_DATA_PROXY_PRESETS: siteConfig.DoubanDataProxyPresets,
    DOUBAN_IMAGE_PROXY_MODE: siteConfig.DoubanImageProxyMode,
    DOUBAN_IMAGE_PROXY_PRESET_ID: siteConfig.DoubanImageProxyPresetId,
    DOUBAN_IMAGE_PROXY_CUSTOM_URL: siteConfig.DoubanImageProxyCustomUrl,
    DOUBAN_IMAGE_PROXY_PRESETS: siteConfig.DoubanImageProxyPresets,
    DISABLE_YELLOW_FILTER: siteConfig.DisableYellowFilter,
    FLUID_SEARCH: siteConfig.FluidSearch,
    M3U8_AD_FILTER_ENABLED: siteConfig.M3U8AdFilterEnabled !== false,
  };
}

export function serializeRuntimeConfig(runtimeConfig: RuntimeConfig): string {
  return `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`;
}
