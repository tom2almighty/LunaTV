/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { deleteSearchHistory } from '@/lib/db.server';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonError } from '@/server/api/http';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ keyword: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const username = await requireActiveUsername(request);
    const { keyword } = await context.params;
    const trimmed = String(keyword || '').trim();
    if (!trimmed) {
      return jsonError('Keyword is required', 400);
    }

    await deleteSearchHistory(username, trimmed);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('删除单条搜索历史失败', err);
    return jsonError('Internal Server Error', 500);
  }
}
