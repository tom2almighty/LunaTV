import { NextRequest } from 'next/server';

import { getAvailableApiSites } from '@/lib/config';
import { getHydratedPlaySessionResponse } from '@/lib/play-session';

import { executeApiHandler } from '@/server/api/handler';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;

  return executeApiHandler(
    request,
    async ({ username }) => {
      const apiSites = await getAvailableApiSites(username as string);
      return getHydratedPlaySessionResponse(
        username as string,
        sessionId,
        apiSites,
      );
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
