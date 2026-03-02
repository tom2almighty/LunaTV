import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

import {
  AdminUserServiceError,
  executeAdminUserAction,
} from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await context.params;
    const body = await request.json();

    let action: 'ban' | 'unban';
    if (body.action === 'ban' || body.action === 'unban') {
      action = body.action;
    } else if (typeof body.banned === 'boolean') {
      action = body.banned ? 'ban' : 'unban';
    } else {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    await executeAdminUserAction(authInfo.username, {
      action,
      targetUsername: username,
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await context.params;
    await executeAdminUserAction(authInfo.username, {
      action: 'deleteUser',
      targetUsername: username,
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
