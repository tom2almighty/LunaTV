/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { getAvailableApiSites } from '@/lib/config';
import { getHydratedPlaySessionResponse } from '@/lib/play-session';

import { executeApiHandler } from '@/server/api/handler';

export const runtime = 'nodejs';
let playSessionReadTotal = 0;
let playSessionReadFailures = 0;

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const startedAt = Date.now();

  return executeApiHandler(
    request,
    async ({ username }) => {
      playSessionReadTotal += 1;

      const apiSites = await getAvailableApiSites(username as string);
      try {
        const response = await getHydratedPlaySessionResponse(
          username as string,
          sessionId,
          apiSites,
        );
        const failureRate =
          playSessionReadTotal === 0
            ? 0
            : playSessionReadFailures / playSessionReadTotal;
        console.info(
          '[api.play.session.get] sessionId=%s ok=true failureRate=%.4f durationMs=%d',
          sessionId,
          failureRate,
          Date.now() - startedAt,
        );
        return response;
      } catch (error) {
        playSessionReadFailures += 1;
        const failureRate =
          playSessionReadTotal === 0
            ? 0
            : playSessionReadFailures / playSessionReadTotal;
        console.warn(
          '[api.play.session.get] sessionId=%s ok=false failureRate=%.4f durationMs=%d',
          sessionId,
          failureRate,
          Date.now() - startedAt,
        );
        throw error;
      }
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
