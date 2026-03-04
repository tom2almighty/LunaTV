/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { deletePlayRecord, getPlayRecord } from '@/lib/db.server';

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

    const record = await getPlayRecord(
      username,
      identity.source,
      identity.videoId,
    );
    return NextResponse.json(record, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('获取单条播放记录失败', err);
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

    await deletePlayRecord(username, identity.source, identity.videoId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('删除单条播放记录失败', err);
    return jsonError('Internal Server Error', 500);
  }
}
