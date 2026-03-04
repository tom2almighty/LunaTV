import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';
import { executeAdminUserAction } from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    let body: {
      username?: unknown;
      usernames?: unknown[];
      userGroups?: unknown[];
    };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const userGroups = Array.isArray(body.userGroups)
      ? body.userGroups.filter((v): v is string => typeof v === 'string')
      : [];

    if (typeof body.username === 'string' && body.username.trim()) {
      await executeAdminUserAction(username, {
        action: 'updateUserGroups',
        targetUsername: body.username,
        userGroups,
      });
    } else {
      const usernames = Array.isArray(body.usernames)
        ? body.usernames.filter((v): v is string => typeof v === 'string')
        : [];

      await executeAdminUserAction(username, {
        action: 'batchUpdateUserGroups',
        usernames,
        userGroups,
      });
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  });
}
