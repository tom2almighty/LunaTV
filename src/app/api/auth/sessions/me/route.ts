import { NextRequest, NextResponse } from 'next/server';

import { resolveSessionRoleByUsername } from '@/server/api/guards';
import { executeApiHandler } from '@/server/api/handler';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const activeUsername = username ?? '';
      const role = await resolveSessionRoleByUsername(activeUsername);

      return NextResponse.json({
        username: activeUsername,
        role,
      });
    },
    {
      requireAuth: true,
      responseShape: 'raw',
    },
  );
}
