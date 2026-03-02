import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

import {
  AdminUserServiceError,
  executeAdminUserAction,
} from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await executeAdminUserAction(authInfo.username, {
      action: 'add',
      targetUsername: String(body.username || ''),
      targetPassword: String(body.password || ''),
      userGroup: body.userGroup ? String(body.userGroup) : undefined,
    });

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
    return NextResponse.json({ error: '用户管理操作失败' }, { status: 500 });
  }
}
