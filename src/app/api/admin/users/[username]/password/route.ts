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
    let body: {
      targetPassword?: string;
      password?: string;
      newPassword?: string;
    };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const targetPassword = String(
      body.targetPassword || body.password || body.newPassword || '',
    );
    if (!targetPassword) {
      throw new ApiValidationError('缺少新密码');
    }

    await executeAdminUserAction(username, {
      action: 'changePassword',
      targetUsername,
      targetPassword,
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
