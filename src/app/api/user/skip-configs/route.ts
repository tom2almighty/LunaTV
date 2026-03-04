/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAllSkipConfigs, setSkipConfig } from '@/lib/db.server';
import { SkipConfig } from '@/lib/types';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    const configs = await getAllSkipConfigs(username);
    return NextResponse.json(configs);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonError(error.message, error.status);
    }
    console.error('获取跳过片头片尾配置失败:', error);
    return jsonError('获取跳过片头片尾配置失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
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

    await setSkipConfig(
      username,
      identity.source,
      identity.videoId,
      skipConfig,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonError(error.message, error.status);
    }
    console.error('保存跳过片头片尾配置失败:', error);
    return jsonError('保存跳过片头片尾配置失败', 500);
  }
}

export async function DELETE() {
  return jsonError('Method Not Allowed', 405);
}
