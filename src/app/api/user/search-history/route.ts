/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  addSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
} from '@/lib/db.server';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonError } from '@/server/api/http';

export const runtime = 'nodejs';

// 最大保存条数（与客户端保持一致）
const HISTORY_LIMIT = 20;

/**
 * GET /api/user/search-history
 * 返回 string[]
 */
export async function GET(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    const history = await getSearchHistory(username);
    return NextResponse.json(history, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('获取搜索历史失败', err);
    return jsonError('Internal Server Error', 500);
  }
}

/**
 * POST /api/user/search-history
 * body: { keyword: string }
 */
export async function POST(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    const body = await request.json();
    const keyword: string = body.keyword?.trim();

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 },
      );
    }

    await addSearchHistory(username, keyword);

    // 再次获取最新列表，确保客户端与服务端同步
    const history = await getSearchHistory(username);
    return NextResponse.json(history.slice(0, HISTORY_LIMIT), { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('添加搜索历史失败', err);
    return jsonError('Internal Server Error', 500);
  }
}

/**
 * DELETE /api/user/search-history?keyword=<kw>
 *
 * 1. 不带 keyword -> 清空全部搜索历史
 * 2. 带 keyword=<kw> -> 删除单条关键字
 */
export async function DELETE(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    await deleteSearchHistory(username);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('删除搜索历史失败', err);
    return jsonError('Internal Server Error', 500);
  }
}
