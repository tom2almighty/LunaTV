import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';
import { executeAdminUserAction } from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    let body: { username?: string; password?: string; userGroup?: string };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    await executeAdminUserAction(username, {
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
  });
}
