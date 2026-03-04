/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { SkipConfig } from '@/lib/types';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';
import { userDataRepository } from '@/server/repositories/user-data-repository';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const configs = await userDataRepository.getAllSkipConfigs(
        username as string,
      );
      return configs;
    },
    {
      requireAuth: true,
      responseShape: 'raw',
      onError: (_, mappedError) => {
        if (mappedError.code !== 'INTERNAL_SERVER_ERROR') {
          return undefined;
        }
        return jsonError('获取跳过片头片尾配置失败', 500);
      },
    },
  );
}

export async function POST(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const body = await request.json();
      const {
        key,
        source,
        videoId,
        config,
      }: {
        key?: string;
        source?: string;
        videoId?: string;
        config?: SkipConfig;
      } = body;

      if (!config) {
        return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
      }

      let resolvedSource = source;
      let resolvedVideoId = videoId;
      if (key && (!resolvedSource || !resolvedVideoId)) {
        const [s, v] = key.split('+');
        resolvedSource = s;
        resolvedVideoId = v;
      }

      let identity: { source: string; videoId: string };
      try {
        identity = parseResourceIdentity(resolvedSource, resolvedVideoId);
      } catch {
        return jsonError('无效的资源标识', 400);
      }

      const skipConfig: SkipConfig = {
        enable: Boolean(config.enable),
        intro_time: Number(config.intro_time) || 0,
        outro_time: Number(config.outro_time) || 0,
      };

      await userDataRepository.setSkipConfig(
        username as string,
        identity.source,
        identity.videoId,
        skipConfig,
      );

      return { success: true };
    },
    {
      requireAuth: true,
      responseShape: 'raw',
      onError: (_, mappedError) => {
        if (mappedError.code !== 'INTERNAL_SERVER_ERROR') {
          return undefined;
        }
        return jsonError('保存跳过片头片尾配置失败', 500);
      },
    },
  );
}

export async function DELETE() {
  return jsonError('Method Not Allowed', 405);
}
