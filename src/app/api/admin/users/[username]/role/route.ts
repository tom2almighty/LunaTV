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
    let body: { role?: string };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const role = String(body.role || '');
    if (role !== 'admin' && role !== 'user') {
      throw new ApiValidationError('参数格式错误');
    }

    await executeAdminUserAction(username, {
      action: role === 'admin' ? 'setAdmin' : 'cancelAdmin',
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
