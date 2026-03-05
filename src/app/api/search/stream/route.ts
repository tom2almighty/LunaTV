/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest } from 'next/server';

import { executeApiHandler } from '@/server/api/handler';
import { createSearchStreamResponse } from '@/server/services/search-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  return executeApiHandler(
    request,
    async ({ username }) => {
      const { searchParams } = new URL(request.url);
      const query = String(searchParams.get('q') || '').trim();
      console.info(
        '[api.search.stream] query=%s durationMs=%d',
        query || 'empty',
        Date.now() - startedAt,
      );
      return createSearchStreamResponse(username as string, query);
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
