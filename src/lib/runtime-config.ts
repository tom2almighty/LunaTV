import type { SiteConfig } from '@/lib/admin.types';

export type RuntimeConfig = {
  DOUBAN_PROXY_TYPE: string;
  DOUBAN_PROXY: string;
  DOUBAN_IMAGE_PROXY_TYPE: string;
  DOUBAN_IMAGE_PROXY: string;
  DISABLE_YELLOW_FILTER: boolean;
  FLUID_SEARCH: boolean;
};

export function buildRuntimeConfig(siteConfig: SiteConfig): RuntimeConfig {
  return {
    DOUBAN_PROXY_TYPE: siteConfig.DoubanProxyType,
    DOUBAN_PROXY: siteConfig.DoubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: siteConfig.DoubanImageProxyType,
    DOUBAN_IMAGE_PROXY: siteConfig.DoubanImageProxy,
    DISABLE_YELLOW_FILTER: siteConfig.DisableYellowFilter,
    FLUID_SEARCH: siteConfig.FluidSearch,
  };
}

export function serializeRuntimeConfig(runtimeConfig: RuntimeConfig): string {
  return `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`;
}
