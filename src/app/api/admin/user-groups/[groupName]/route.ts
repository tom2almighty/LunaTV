import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';
import { executeAdminUserAction } from '@/server/services/admin-user-service';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ groupName: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { groupName } = await context.params;

  return executeAdminApiHandler(request, async ({ username }) => {
    let body: { enabledApis?: unknown[] };
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const enabledApis = Array.isArray(body.enabledApis)
      ? body.enabledApis.filter((v): v is string => typeof v === 'string')
      : [];

    await executeAdminUserAction(username, {
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
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { groupName } = await context.params;

  return executeAdminApiHandler(request, async ({ username }) => {
    await executeAdminUserAction(username, {
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
  });
}
