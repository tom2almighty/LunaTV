/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';
import { searchAllSources } from '@/server/services/search-service';

export const runtime = 'nodejs';

function buildSearchCacheHeaders(cacheTime: number) {
  return {
    'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    'Netlify-Vary': 'query',
  };
}

export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q');
      const cacheTime = await getCacheTime();

      if (!query) {
        return NextResponse.json(
          { results: [] },
          {
            headers: buildSearchCacheHeaders(cacheTime),
          },
        );
      }

      const flattenedResults = await searchAllSources(
        username as string,
        query,
      );
      if (flattenedResults.length === 0) {
        return { results: [] };
      }

      return NextResponse.json(
        { results: flattenedResults },
        {
          headers: buildSearchCacheHeaders(cacheTime),
        },
      );
    },
    {
      requireAuth: true,
      responseShape: 'raw',
      onError: (_, mappedError) => {
        if (mappedError.status !== 500) return undefined;
        return jsonError('搜索失败', 500);
      },
    },
  );
}
