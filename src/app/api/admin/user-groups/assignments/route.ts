import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

import {
  AdminUserServiceError,
  executeAdminUserAction,
} from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userGroups = Array.isArray(body.userGroups)
      ? body.userGroups.filter((v: unknown) => typeof v === 'string')
      : [];

    if (typeof body.username === 'string' && body.username.trim()) {
      await executeAdminUserAction(authInfo.username, {
        action: 'updateUserGroups',
        targetUsername: body.username,
        userGroups,
      });
    } else {
      const usernames = Array.isArray(body.usernames)
        ? body.usernames.filter((v: unknown) => typeof v === 'string')
        : [];
      await executeAdminUserAction(authInfo.username, {
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
  } catch (error) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: '用户组操作失败' }, { status: 500 });
  }
}
