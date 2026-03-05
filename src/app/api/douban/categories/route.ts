import { NextResponse } from 'next/server';

import { getDoubanCacheTime } from '@/lib/config';
import { getDoubanCategoriesServer } from '@/lib/douban';
import { DEFAULT_DOUBAN_PAGE_LIMIT } from '@/lib/douban.constants';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const kind = searchParams.get('kind') || 'movie';
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const pageLimit = parseInt(
    searchParams.get('limit') || String(DEFAULT_DOUBAN_PAGE_LIMIT),
    10,
  );
  const pageStart = parseInt(searchParams.get('start') || '0');

  // 验证参数
  if (!kind || !category || !type) {
    return NextResponse.json(
      { error: '缺少必要参数: kind 或 category 或 type' },
      { status: 400 },
    );
  }

  if (!['tv', 'movie'].includes(kind)) {
    return NextResponse.json(
      { error: 'kind 参数必须是 tv 或 movie' },
      { status: 400 },
    );
  }

  if (pageLimit < 1 || pageLimit > 100) {
    return NextResponse.json(
      { error: 'pageLimit 必须在 1-100 之间' },
      { status: 400 },
    );
  }

  if (pageStart < 0) {
    return NextResponse.json(
      { error: 'pageStart 不能小于 0' },
      { status: 400 },
    );
  }

  try {
    const response = await getDoubanCategoriesServer({
      kind: kind as 'tv' | 'movie',
      category,
      type,
      pageLimit,
      pageStart,
    });

    if (response.code !== 200) {
      return NextResponse.json(
        { error: '获取豆瓣数据失败', details: response.message },
        { status: 500 },
      );
    }

    const cacheTime = await getDoubanCacheTime();
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取豆瓣数据失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}
