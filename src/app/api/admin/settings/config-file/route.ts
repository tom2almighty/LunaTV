/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { getConfig, refineConfig } from '@/lib/config';
import { saveAdminConfig } from '@/lib/db.server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(
    request,
    async () => {
      let body: {
        configFile?: unknown;
        subscriptionUrl?: unknown;
        autoUpdate?: unknown;
        lastCheckTime?: unknown;
      };
      try {
        body = await request.json();
      } catch {
        throw new ApiValidationError('请求体格式错误');
      }

      const configFile = body.configFile;
      if (!configFile || typeof configFile !== 'string') {
        throw new ApiValidationError('配置文件内容不能为空');
      }

      try {
        JSON.parse(configFile);
      } catch {
        throw new ApiValidationError('配置文件格式错误，请检查 JSON 语法');
      }

      let adminConfig = await getConfig();
      adminConfig.ConfigFile = configFile;
      if (!adminConfig.ConfigSubscribtion) {
        adminConfig.ConfigSubscribtion = {
          URL: '',
          AutoUpdate: false,
          LastCheck: '',
        };
      }

      if (body.subscriptionUrl !== undefined) {
        adminConfig.ConfigSubscribtion.URL = String(body.subscriptionUrl || '');
      }
      if (body.autoUpdate !== undefined) {
        adminConfig.ConfigSubscribtion.AutoUpdate = Boolean(body.autoUpdate);
      }
      adminConfig.ConfigSubscribtion.LastCheck = String(
        body.lastCheckTime || '',
      );

      adminConfig = refineConfig(adminConfig);
      await saveAdminConfig(adminConfig);

      return {
        success: true,
        message: '配置文件更新成功',
      };
    },
    {
      ownerOnly: true,
      ownerOnlyMessage: '权限不足，只有站长可以修改配置文件',
    },
  );
}
