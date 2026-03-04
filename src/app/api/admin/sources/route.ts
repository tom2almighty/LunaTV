/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  AdminSourceApiError,
  cleanupSourcePermissions,
  persistAdminConfig,
  requireSourceAdminConfig,
} from './_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    return NextResponse.json(adminConfig.SourceConfig, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof AdminSourceApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: '获取视频源失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    const body = (await request.json()) as {
      key?: string;
      name?: string;
      api?: string;
      detail?: string;
    };
    const { key, name, api, detail } = body;
    if (!key || !name || !api) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    if (adminConfig.SourceConfig.some((item) => item.key === key)) {
      return NextResponse.json({ error: '该源已存在' }, { status: 400 });
    }

    adminConfig.SourceConfig.push({
      key,
      name,
      api,
      detail,
      from: 'custom',
      disabled: false,
    });
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
    console.error('新增视频源失败:', error);
    return NextResponse.json({ error: '新增视频源失败' }, { status: 500 });
  }
}

type BatchAction = 'batch_disable' | 'batch_enable' | 'batch_delete';

export async function PATCH(request: NextRequest) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    const body = (await request.json()) as {
      action?: BatchAction;
      keys?: string[];
    };
    const { action, keys } = body;
    if (!action || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: '缺少 keys 参数或为空' },
        { status: 400 },
      );
    }

    if (action === 'batch_disable' || action === 'batch_enable') {
      const disabled = action === 'batch_disable';
      keys.forEach((key) => {
        const source = adminConfig.SourceConfig.find(
          (item) => item.key === key,
        );
        if (source) {
          source.disabled = disabled;
        }
      });
    } else if (action === 'batch_delete') {
      const deletedKeys = keys.filter((key) => {
        const source = adminConfig.SourceConfig.find(
          (item) => item.key === key,
        );
        return source && source.from !== 'config';
      });
      if (deletedKeys.length > 0) {
        adminConfig.SourceConfig = adminConfig.SourceConfig.filter(
          (item) => !deletedKeys.includes(item.key),
        );
        cleanupSourcePermissions(adminConfig, deletedKeys);
      }
    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

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
    console.error('批量操作视频源失败:', error);
    return NextResponse.json({ error: '批量操作视频源失败' }, { status: 500 });
  }
}
