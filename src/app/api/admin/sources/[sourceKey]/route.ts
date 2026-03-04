/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  AdminSourceApiError,
  cleanupSourcePermissions,
  persistAdminConfig,
  requireSourceAdminConfig,
} from '../_utils';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sourceKey: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    const { sourceKey } = await context.params;
    const body = (await request.json()) as { disabled?: boolean };
    if (typeof body.disabled !== 'boolean') {
      return NextResponse.json(
        { error: '缺少 disabled 参数' },
        { status: 400 },
      );
    }

    const source = adminConfig.SourceConfig.find(
      (item) => item.key === sourceKey,
    );
    if (!source) {
      return NextResponse.json({ error: '源不存在' }, { status: 404 });
    }

    source.disabled = body.disabled;
    await persistAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof AdminSourceApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('更新视频源失败:', error);
    return NextResponse.json({ error: '更新视频源失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    const { sourceKey } = await context.params;
    const sourceIndex = adminConfig.SourceConfig.findIndex(
      (item) => item.key === sourceKey,
    );
    if (sourceIndex === -1) {
      return NextResponse.json({ error: '源不存在' }, { status: 404 });
    }

    const source = adminConfig.SourceConfig[sourceIndex];
    if (source.from === 'config') {
      return NextResponse.json({ error: '该源不可删除' }, { status: 400 });
    }

    adminConfig.SourceConfig.splice(sourceIndex, 1);
    cleanupSourcePermissions(adminConfig, [sourceKey]);
    await persistAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof AdminSourceApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('删除视频源失败:', error);
    return NextResponse.json({ error: '删除视频源失败' }, { status: 500 });
  }
}
