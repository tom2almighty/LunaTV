import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';
import {
  executeAdminUserAction,
  getUserGroupsForOperator,
} from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    const groups = await getUserGroupsForOperator(username);
    return { groups };
  });
}

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    let body: { name?: string; enabledApis?: unknown[] };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const groupName = String(body.name || '').trim();
    if (!groupName) {
      throw new ApiValidationError('缺少用户组名称');
    }

    const enabledApis = Array.isArray(body.enabledApis)
      ? body.enabledApis.filter((v): v is string => typeof v === 'string')
      : [];

    await executeAdminUserAction(username, {
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
  });
}
