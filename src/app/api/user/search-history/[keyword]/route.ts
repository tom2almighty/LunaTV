/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';
import { userDataRepository } from '@/server/repositories/user-data-repository';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ keyword: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { keyword } = await context.params;
  return executeApiHandler(
    request,
    async ({ username }) => {
      const trimmed = String(keyword || '').trim();
      if (!trimmed) {
        return jsonError('Keyword is required', 400);
      }

      await userDataRepository.deleteSearchHistory(username as string, trimmed);
      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}
