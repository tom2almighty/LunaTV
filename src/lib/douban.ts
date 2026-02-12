/* eslint-disable no-console */

import { getDoubanCacheTime } from './config';
import { getDoubanCache, setDoubanCache } from './db';
import { DoubanItem, DoubanResult } from './types';

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

/**
 * 通用的豆瓣数据获取函数
 * @param url 请求的URL
 * @returns Promise<T> 返回指定类型的数据
 */
export async function fetchDoubanData<T>(url: string): Promise<T> {
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 设置请求选项，包括信号和头部
  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://movie.douban.com',
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 服务端获取豆瓣分类数据（带 SQLite 缓存）
 */
export async function getDoubanCategoriesServer(params: {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;

  // 生成缓存 key
  const cacheKey = `home_${kind}_${category}_${type}_${pageStart}_${pageLimit}`;

  // 尝试从缓存获取
  try {
    const cached = await getDoubanCache<DoubanResult>(cacheKey);
    if (cached) {
      console.log(`豆瓣缓存命中: ${cacheKey}`);
      return cached;
    }
  } catch (err) {
    console.error('读取豆瓣缓存失败:', err);
  }

  // 缓存未命中，从豆瓣 API 获取
  const target = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

  try {
    const doubanData = await fetchDoubanData<DoubanCategoryApiResponse>(target);

    // 转换数据格式
    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    const result: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: list,
    };

    // 写入缓存
    try {
      const cacheTime = await getDoubanCacheTime();
      await setDoubanCache(cacheKey, result, cacheTime);
      console.log(`豆瓣数据已缓存: ${cacheKey}, 过期时间: ${cacheTime}秒`);
    } catch (err) {
      console.error('写入豆瓣缓存失败:', err);
    }

    return result;
  } catch (error) {
    console.error('获取豆瓣数据失败:', error);
    return {
      code: 500,
      message: `获取失败: ${(error as Error).message}`,
      list: [],
    };
  }
}
