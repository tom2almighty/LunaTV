/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { changePassword } from '@/lib/db.server';

import {
  ApiBusinessError,
  ApiValidationError,
  executeApiHandler,
} from '@/server/api/handler';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      let body: { newPassword?: unknown };
      try {
        body = await request.json();
      } catch {
        throw new ApiValidationError('请求体格式错误');
      }

      const newPassword =
        typeof body.newPassword === 'string' ? body.newPassword : '';
      if (!newPassword) {
        throw new ApiValidationError('新密码不得为空');
      }

      if (username === process.env.APP_ADMIN_USERNAME) {
        throw new ApiBusinessError('站长不能通过此接口修改密码', 403);
      }

      await changePassword(username as string, newPassword);
      return { ok: true };
    },
    {
      requireAuth: true,
      responseShape: 'raw',
      onError: (error, mappedError) => {
        if (mappedError.status !== 500) {
          return undefined;
        }
        return NextResponse.json(
          {
            error: '修改密码失败',
            details: error instanceof Error ? error.message : undefined,
          },
          { status: 500 },
        );
      },
    },
  );
}
