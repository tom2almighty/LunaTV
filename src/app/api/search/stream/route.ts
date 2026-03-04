/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest } from 'next/server';

import { executeApiHandler } from '@/server/api/handler';
import { createSearchStreamResponse } from '@/server/services/search-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const { searchParams } = new URL(request.url);
      const query = String(searchParams.get('q') || '').trim();
      return createSearchStreamResponse(username as string, query);
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
