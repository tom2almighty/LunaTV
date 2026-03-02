import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

import {
  AdminUserServiceError,
  executeAdminUserAction,
  getUserGroupsForOperator,
} from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups = await getUserGroupsForOperator(authInfo.username);
    return NextResponse.json({ groups });
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

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const groupName = String(body.name || '');
    if (!groupName.trim()) {
      return NextResponse.json({ error: '缺少用户组名称' }, { status: 400 });
    }

    const enabledApis = Array.isArray(body.enabledApis)
      ? body.enabledApis.filter((v: unknown) => typeof v === 'string')
      : [];

    await executeAdminUserAction(authInfo.username, {
      action: 'userGroup',
      groupAction: 'add',
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
