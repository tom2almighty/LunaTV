/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { resetConfig } from '@/lib/config';

import { executeAdminApiHandler } from '@/server/api/admin-handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(
    request,
    async () => {
      await resetConfig();

      return NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    },
    {
      ownerOnly: true,
      ownerOnlyMessage: '仅支持站长重置配置',
    },
  );
}
