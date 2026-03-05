/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import {
  assertSafeOutgoingUrl,
  parseAllowedHostsFromEnv,
} from '@/lib/security/url-guard';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiBusinessError, ApiValidationError } from '@/server/api/handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(
    request,
    async () => {
      let body: { url?: unknown };
      try {
        body = await request.json();
      } catch {
        throw new ApiValidationError('请求体格式错误');
      }

      const url = String(body.url || '');
      if (!url) {
        throw new ApiValidationError('缺少URL参数');
      }

      await assertSafeOutgoingUrl(url, {
        allowedHosts: parseAllowedHostsFromEnv(
          process.env.CONFIG_SUBSCRIPTION_ALLOWED_HOSTS,
        ),
      });

      const response = await fetch(url);
      if (!response.ok) {
        throw new ApiBusinessError(
          `请求失败: ${response.status} ${response.statusText}`,
          response.status,
          'CONFIG_SUBSCRIPTION_FETCH_FAILED',
        );
      }

      const configContent = await response.text();

      let decodedContent;
      try {
        const bs58 = (await import('bs58')).default;
        const decodedBytes = bs58.decode(configContent);
        decodedContent = new TextDecoder().decode(decodedBytes);
      } catch (decodeError) {
        console.warn('Base58 解码失败', decodeError);
        throw new ApiBusinessError('拉取配置失败', 500, 'CONFIG_DECODE_FAILED');
      }

      return {
        success: true,
        configContent: decodedContent,
        message: '配置拉取成功',
      };
    },
    {
      ownerOnly: true,
      ownerOnlyMessage: '权限不足，只有站长可以拉取配置订阅',
    },
  );
}
