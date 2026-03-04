import { NextRequest } from 'next/server';

import { getAvailableApiSites } from '@/lib/config';
import { switchPlaySessionCurrentAndHydrate } from '@/lib/play-session';

import { ApiValidationError, executeApiHandler } from '@/server/api/handler';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;

  return executeApiHandler(
    request,
    async ({ username }) => {
      let body: { source?: string; id?: string };
      try {
        body = await request.json();
      } catch {
        throw new ApiValidationError('请求体格式错误');
      }

      const apiSites = await getAvailableApiSites(username as string);
      return switchPlaySessionCurrentAndHydrate(
        username as string,
        sessionId,
        String(body.source || ''),
        String(body.id || ''),
        apiSites,
      );
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
