/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';
import { userDataRepository } from '@/server/repositories/user-data-repository';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ source: string; videoId: string }>;
};

function parseParams(
  source: string | undefined,
  videoId: string | undefined,
): { source: string; videoId: string } | null {
  try {
    return parseResourceIdentity(source, videoId);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return executeApiHandler(
    request,
    async ({ username }) => {
      const identity = parseParams(params.source, params.videoId);
      if (!identity) {
        return jsonError('Invalid resource identity', 400);
      }

      const record = await userDataRepository.getPlayRecord(
        username as string,
        identity.source,
        identity.videoId,
      );
      return record;
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return executeApiHandler(
    request,
    async ({ username }) => {
      const identity = parseParams(params.source, params.videoId);
      if (!identity) {
        return jsonError('Invalid resource identity', 400);
      }

      await userDataRepository.deletePlayRecord(
        username as string,
        identity.source,
        identity.videoId,
      );
      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}
