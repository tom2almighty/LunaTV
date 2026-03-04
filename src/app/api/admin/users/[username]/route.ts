import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';
import { executeAdminUserAction } from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { username: targetUsername } = await context.params;

  return executeAdminApiHandler(request, async ({ username }) => {
    let body: { action?: string; banned?: boolean };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    let action: 'ban' | 'unban';
    if (body.action === 'ban' || body.action === 'unban') {
      action = body.action;
    } else if (typeof body.banned === 'boolean') {
      action = body.banned ? 'ban' : 'unban';
    } else {
      throw new ApiValidationError('参数格式错误');
    }

    await executeAdminUserAction(username, {
      action,
      targetUsername,
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { username: targetUsername } = await context.params;

  return executeAdminApiHandler(request, async ({ username }) => {
    await executeAdminUserAction(username, {
      action: 'deleteUser',
      targetUsername,
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
