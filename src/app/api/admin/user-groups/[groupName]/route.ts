import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

import {
  AdminUserServiceError,
  executeAdminUserAction,
} from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ groupName: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupName } = await context.params;
    const body = await request.json();
    const enabledApis = Array.isArray(body.enabledApis)
      ? body.enabledApis.filter((v: unknown) => typeof v === 'string')
      : [];

    await executeAdminUserAction(authInfo.username, {
      action: 'userGroup',
      groupAction: 'edit',
      groupName,
      enabledApis,
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
    return NextResponse.json({ error: '用户组操作失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupName } = await context.params;
    await executeAdminUserAction(authInfo.username, {
      action: 'userGroup',
      groupAction: 'delete',
      groupName,
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
    return NextResponse.json({ error: '用户组操作失败' }, { status: 500 });
  }
}
