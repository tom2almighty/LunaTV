/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import he from 'he';

function getDoubanImageProxyConfig(): {
  proxyType: 'server' | 'custom';
  proxyUrl: string;
} {
  if (typeof window === 'undefined') {
    return { proxyType: 'server', proxyUrl: '' };
  }
  const doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'server';
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType === 'custom' ? 'custom' : 'server',
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
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
