/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiBusinessError, ApiValidationError } from '@/server/api/handler';

import {
  cleanupSourcePermissions,
  persistAdminConfig,
  requireSourceAdminConfig,
} from '../_utils';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sourceKey: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { sourceKey } = await context.params;

  return executeAdminApiHandler(request, async ({ username }) => {
    const adminConfig = await requireSourceAdminConfig(username);
    let body: { disabled?: boolean };

    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    if (typeof body.disabled !== 'boolean') {
      throw new ApiValidationError('缺少 disabled 参数');
    }

    const source = adminConfig.SourceConfig.find(
      (item) => item.key === sourceKey,
    );
    if (!source) {
      throw new ApiBusinessError('源不存在', 404, 'ADMIN_SOURCE_NOT_FOUND');
    }

    source.disabled = body.disabled;
    await persistAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { sourceKey } = await context.params;

  return executeAdminApiHandler(request, async ({ username }) => {
    const adminConfig = await requireSourceAdminConfig(username);
    const sourceIndex = adminConfig.SourceConfig.findIndex(
      (item) => item.key === sourceKey,
    );
    if (sourceIndex === -1) {
      throw new ApiBusinessError('源不存在', 404, 'ADMIN_SOURCE_NOT_FOUND');
    }

    const source = adminConfig.SourceConfig[sourceIndex];
    if (source.from === 'config') {
      throw new ApiValidationError('该源不可删除');
    }

    adminConfig.SourceConfig.splice(sourceIndex, 1);
    cleanupSourcePermissions(adminConfig, [sourceKey]);
    await persistAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  });
}
