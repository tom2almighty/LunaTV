/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { deleteSearchHistory } from '@/lib/db.server';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';

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

      await deleteSearchHistory(username as string, trimmed);
      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}
