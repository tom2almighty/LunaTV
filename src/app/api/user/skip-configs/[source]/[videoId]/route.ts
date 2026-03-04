/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { deleteSkipConfig, getSkipConfig } from '@/lib/db.server';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ source: string; videoId: string }>;
};

function parseParams(
  source: string | undefined,
  videoId: string | undefined,
): { source: string; videoId: string } | null {
  try {
    return parseResourceIdentity(source, videoId);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const username = await requireActiveUsername(request);
    const params = await context.params;
    const identity = parseParams(params.source, params.videoId);
    if (!identity) {
      return jsonError('Invalid resource identity', 400);
    }

    const config = await getSkipConfig(
      username,
      identity.source,
      identity.videoId,
    );
    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonError(error.message, error.status);
    }
    console.error('获取跳过配置失败:', error);
    return jsonError('Internal Server Error', 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const username = await requireActiveUsername(request);
    const params = await context.params;
    const identity = parseParams(params.source, params.videoId);
    if (!identity) {
      return jsonError('Invalid resource identity', 400);
    }

    await deleteSkipConfig(username, identity.source, identity.videoId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonError(error.message, error.status);
    }
    console.error('删除跳过配置失败:', error);
    return jsonError('Internal Server Error', 500);
  }
}
