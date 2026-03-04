import { NextRequest } from 'next/server';

import { ApiValidationError, executeApiHandler } from '@/server/api/handler';
import { createPlaySessionByRequest } from '@/server/services/search-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        throw new ApiValidationError('请求体格式错误');
      }

      return createPlaySessionByRequest(username as string, body);
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
