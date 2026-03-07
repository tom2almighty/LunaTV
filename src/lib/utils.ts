/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import he from 'he';

import { resolveDoubanImageProxy } from './douban-proxy-settings';
import type { RuntimeConfig } from './runtime-config';

type ProcessImageUrlOptions = {
  runtimeConfig?: Partial<RuntimeConfig> | null;
};

function getRuntimeConfig(
  runtimeConfig?: Partial<RuntimeConfig> | null,
): Partial<RuntimeConfig> | undefined {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as any).RUNTIME_CONFIG;
}

function getDoubanImageProxyConfig(options: ProcessImageUrlOptions = {}): {
  proxyType: 'server' | 'custom';
  proxyUrl: string;
} {
  const runtimeConfig = getRuntimeConfig(options.runtimeConfig);

  return resolveDoubanImageProxy({
    runtime: {
      mode: runtimeConfig?.DOUBAN_IMAGE_PROXY_MODE ?? 'server',
      presetId: runtimeConfig?.DOUBAN_IMAGE_PROXY_PRESET_ID ?? '',
      customUrl: runtimeConfig?.DOUBAN_IMAGE_PROXY_CUSTOM_URL ?? '',
      presets: runtimeConfig?.DOUBAN_IMAGE_PROXY_PRESETS ?? [],
    },
  });
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(
  originalUrl: string,
  options?: ProcessImageUrlOptions,
): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig(options);
  switch (proxyType) {
    case 'custom':
      return proxyUrl
        ? `${proxyUrl}${encodeURIComponent(originalUrl)}`
        : `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'server':
    default:
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
