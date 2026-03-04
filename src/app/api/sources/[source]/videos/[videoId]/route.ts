import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getCacheTime } from '@/lib/config';

import { getVideoDetailBySource } from '@/server/services/search-service';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ source: string; videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { source, videoId } = await context.params;
  const sourceCode = String(source || '').trim();
  const id = String(videoId || '').trim();
  if (!sourceCode || !id) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: '无效的视频ID格式' }, { status: 400 });
  }

  try {
    const result = await getVideoDetailBySource(
      sourceCode,
      id,
      authInfo.username,
    );
    const cacheTime = await getCacheTime();

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取视频详情失败';
    const status = message.includes('无效的API来源') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
