/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';

import {
  cleanupSourcePermissions,
  persistAdminConfig,
  requireSourceAdminConfig,
} from './_utils';

export const runtime = 'nodejs';

type BatchAction = 'batch_disable' | 'batch_enable' | 'batch_delete';

export async function GET(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    const adminConfig = await requireSourceAdminConfig(username);
    return NextResponse.json(adminConfig.SourceConfig, {
      headers: { 'Cache-Control': 'no-store' },
    });
  });
}

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    const adminConfig = await requireSourceAdminConfig(username);
    let body: {
      key?: string;
      name?: string;
      api?: string;
      detail?: string;
    };

    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const { key, name, api, detail } = body;
    if (!key || !name || !api) {
      throw new ApiValidationError('缺少必要参数');
    }
    if (adminConfig.SourceConfig.some((item) => item.key === key)) {
      throw new ApiValidationError('该源已存在');
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
  });
}

export async function PATCH(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ username }) => {
    const adminConfig = await requireSourceAdminConfig(username);
    let body: { action?: BatchAction; keys?: string[] };

    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const { action, keys } = body;
    if (!action || !Array.isArray(keys) || keys.length === 0) {
      throw new ApiValidationError('缺少 keys 参数或为空');
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
      throw new ApiValidationError('未知操作');
    }

    await persistAdminConfig(adminConfig);
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  });
}
