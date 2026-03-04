import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';
import {
  getPlaySession,
  hydrateCurrentPlayDetail,
  toSessionResponse,
} from '@/lib/play-session';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const playSessionId = String(sessionId || '');
  if (!playSessionId) {
    return NextResponse.json({ error: '缺少播放会话ID' }, { status: 400 });
  }

  const session = getPlaySession(authInfo.username, playSessionId);
  if (!session) {
    return NextResponse.json(
      { error: '播放会话不存在或已过期' },
      { status: 404 },
    );
  }

  try {
    const apiSites = await getAvailableApiSites(authInfo.username);
    const currentDetail = await hydrateCurrentPlayDetail(session, apiSites);
    return NextResponse.json(toSessionResponse(session, currentDetail));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取播放会话失败' },
      { status: 500 },
    );
  }
}
