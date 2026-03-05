/* eslint-disable @typescript-eslint/no-explicit-any */

import { DEFAULT_DOUBAN_PAGE_LIMIT } from '@/lib/douban.constants';

import { resolveDoubanDataProxy } from './douban-proxy-settings';
import { DoubanItem, DoubanResult } from './types';

interface DoubanCategoriesParams {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

interface DoubanCategoryApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

async function fetchWithTimeout(
  url: string,
  proxyUrl: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const finalUrl = proxyUrl ? `${proxyUrl}${encodeURIComponent(url)}` : url;

  const fetchOptions: RequestInit = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
    },
  };

  try {
    const response = await fetch(finalUrl, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function getDoubanProxyConfig(): {
  proxyType: 'server' | 'custom';
  proxyUrl: string;
} {
  if (typeof window === 'undefined') {
    return { proxyType: 'server', proxyUrl: '' };
  }

  const runtimeConfig = (window as any).RUNTIME_CONFIG;
  return resolveDoubanDataProxy({
    runtime: {
      mode: runtimeConfig?.DOUBAN_DATA_PROXY_MODE ?? 'server',
      presetId: runtimeConfig?.DOUBAN_DATA_PROXY_PRESET_ID ?? '',
      customUrl: runtimeConfig?.DOUBAN_DATA_PROXY_CUSTOM_URL ?? '',
      presets: runtimeConfig?.DOUBAN_DATA_PROXY_PRESETS ?? [],
    },
    storage: {
      mode: localStorage.getItem('doubanDataProxyMode'),
      presetId: localStorage.getItem('doubanDataProxyPresetId'),
      customUrl: localStorage.getItem('doubanDataProxyCustomUrl'),
    },
  });
}

export async function fetchDoubanCategories(
  params: DoubanCategoriesParams,
  proxyUrl: string,
): Promise<DoubanResult> {
  const {
    kind,
    category,
    type,
    pageLimit = DEFAULT_DOUBAN_PAGE_LIMIT,
    pageStart = 0,
  } = params;

  if (!['tv', 'movie'].includes(kind)) {
    throw new Error('kind 参数必须是 tv 或 movie');
  }

  if (!category || !type) {
    throw new Error('category 和 type 参数不能为空');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必须在 1-100 之间');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小于 0');
  }

  const target = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

  try {
    const response = await fetchWithTimeout(target, proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanCategoryApiResponse = await response.json();

    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '获取成功',
      list,
    };
  } catch (error) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('globalError', {
          detail: { message: '获取豆瓣数据失败' },
        }),
      );
    }
    throw new Error(`获取豆瓣数据失败: ${(error as Error).message}`);
  }
}

export async function getDoubanCategories(
  params: DoubanCategoriesParams,
): Promise<DoubanResult> {
  const {
    kind,
    category,
    type,
    pageLimit = DEFAULT_DOUBAN_PAGE_LIMIT,
    pageStart = 0,
  } = params;
  const { proxyType, proxyUrl } = getDoubanProxyConfig();

  if (proxyType === 'custom' && proxyUrl) {
    return fetchDoubanCategories(params, proxyUrl);
  }

  const response = await fetch(
    `/api/douban/categories?kind=${kind}&category=${category}&type=${type}&limit=${pageLimit}&start=${pageStart}`,
  );

  return response.json();
}
