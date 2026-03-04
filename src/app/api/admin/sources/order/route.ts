/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';

import { persistAdminConfig, requireSourceAdminConfig } from '../_utils';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    const adminConfig = await requireSourceAdminConfig(username);
    let body: { order?: string[] };

    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const { order } = body;
    if (!Array.isArray(order)) {
      throw new ApiValidationError('排序列表格式错误');
    }

    const sourceMap = new Map(
      adminConfig.SourceConfig.map((source) => [source.key, source]),
    );
    const reordered: typeof adminConfig.SourceConfig = [];
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
  });
}
