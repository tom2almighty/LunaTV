import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';
import {
  getPlaySession,
  hydrateCurrentPlayDetail,
  setPlaySessionCurrent,
  toSessionResponse,
} from '@/lib/play-session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const playSessionId = searchParams.get('ps') || '';
  if (!playSessionId) {
    return NextResponse.json({ error: '缺少播放会话ID' }, { status: 400 });
  }

  const session = getPlaySession(authInfo.username, playSessionId);
  if (!session) {
    return NextResponse.json({ error: '播放会话不存在或已过期' }, { status: 404 });
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

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ps?: string; source?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const playSessionId = String(body.ps || '');
  const source = String(body.source || '');
  const id = String(body.id || '');
  if (!playSessionId || !source || !id) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  const session = getPlaySession(authInfo.username, playSessionId);
  if (!session) {
    return NextResponse.json({ error: '播放会话不存在或已过期' }, { status: 404 });
  }

  try {
    setPlaySessionCurrent(session, source, id);
    const apiSites = await getAvailableApiSites(authInfo.username);
    const currentDetail = await hydrateCurrentPlayDetail(session, apiSites);
    return NextResponse.json(toSessionResponse(session, currentDetail));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '切换播放源失败' },
      { status: 500 },
    );
  }
}

