/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  AdminSourceApiError,
  persistAdminConfig,
  requireSourceAdminConfig,
} from '../_utils';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    const body = (await request.json()) as { order?: string[] };
    const { order } = body;
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: '排序列表格式错误' }, { status: 400 });
    }

    const sourceMap = new Map(
      adminConfig.SourceConfig.map((source) => [source.key, source]),
    );
    const reordered = [];
    order.forEach((key) => {
      const source = sourceMap.get(key);
      if (source) {
        reordered.push(source);
        sourceMap.delete(key);
      }
    });

    adminConfig.SourceConfig.forEach((source) => {
      if (sourceMap.has(source.key)) {
        reordered.push(source);
      }
    });

    adminConfig.SourceConfig = reordered;
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
    console.error('保存视频源排序失败:', error);
    return NextResponse.json({ error: '保存视频源排序失败' }, { status: 500 });
  }
}
