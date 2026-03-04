import { SearchResult } from '@/lib/types';

import {
  getApiSiteBySource,
  getVideoDetailBySource,
} from '@/server/services/search-service';

import { searchFromApi } from './downstream';

interface FetchVideoDetailOptions {
  source: string;
  id: string;
  fallbackTitle?: string;
}

/**
 * 根据 source 与 id 获取视频详情。
 * 1. 若传入 fallbackTitle，则先调用搜索能力做精确匹配。
 * 2. 若未命中，则回退到 source/video 资源详情能力。
 */
export async function fetchVideoDetail({
  source,
  id,
  fallbackTitle = '',
}: FetchVideoDetailOptions): Promise<SearchResult> {
  // 优先通过搜索接口查找精确匹配
  const apiSite = await getApiSiteBySource(source);
  if (!apiSite) {
    throw new Error('无效的API来源');
  }
  if (fallbackTitle) {
    try {
      const searchData = await searchFromApi(apiSite, fallbackTitle.trim());
      const exactMatch = searchData.find(
        (item: SearchResult) =>
          item.source.toString() === source.toString() &&
          item.id.toString() === id.toString(),
      );
      if (exactMatch) {
        return exactMatch;
      }
    } catch (error) {
      // do nothing
    }
  }

  const detail = await getVideoDetailBySource(source, id);
  if (!detail) {
    throw new Error('获取视频详情失败');
  }

  return detail;
}
