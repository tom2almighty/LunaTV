import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';

import { ApiValidationError, executeApiHandler } from '@/server/api/handler';
import { getVideoDetailBySource } from '@/server/services/search-service';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ source: string; videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { source, videoId } = await context.params;

  return executeApiHandler(
    request,
    async ({ username }) => {
      const sourceCode = String(source || '').trim();
      const id = String(videoId || '').trim();
      if (!sourceCode || !id) {
        throw new ApiValidationError('缺少必要参数');
      }
      if (!/^[\w-]+$/.test(id)) {
        throw new ApiValidationError('无效的视频ID格式');
      }

      const result = await getVideoDetailBySource(
        sourceCode,
        id,
        username as string,
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
    },
    {
      requireAuth: true,
      responseShape: 'raw',
      onError: (error, mappedError) => {
        if (mappedError.status !== 500) {
          return undefined;
        }
        const message =
          error instanceof Error ? error.message : '获取视频详情失败';
        return NextResponse.json({ error: message }, { status: 500 });
      },
    },
  );
}
