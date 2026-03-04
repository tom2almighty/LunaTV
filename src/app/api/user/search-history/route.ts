/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { executeApiHandler } from '@/server/api/handler';
import { userDataRepository } from '@/server/repositories/user-data-repository';

export const runtime = 'nodejs';

// 最大保存条数（与客户端保持一致）
const HISTORY_LIMIT = 20;

/**
 * GET /api/user/search-history
 * 返回 string[]
 */
export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const history = await userDataRepository.getSearchHistory(
        username as string,
      );
      return history;
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}

/**
 * POST /api/user/search-history
 * body: { keyword: string }
 */
export async function POST(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const body = await request.json();
      const keyword: string = body.keyword?.trim();

      if (!keyword) {
        return NextResponse.json(
          { error: 'Keyword is required' },
          { status: 400 },
        );
      }

      await userDataRepository.addSearchHistory(username as string, keyword);

      const history = await userDataRepository.getSearchHistory(
        username as string,
      );
      return history.slice(0, HISTORY_LIMIT);
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}

/**
 * DELETE /api/user/search-history?keyword=<kw>
 *
 * 1. 不带 keyword -> 清空全部搜索历史
 * 2. 带 keyword=<kw> -> 删除单条关键字
 */
export async function DELETE(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      await userDataRepository.deleteSearchHistory(username as string);
      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}
