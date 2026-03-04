/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { AdminConfigResult } from '@/lib/admin.types';
import { getConfig } from '@/lib/config';

import { executeAdminApiHandler } from '@/server/api/admin-handler';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeAdminApiHandler(request, async ({ role }) => {
    const config = await getConfig();
    const result: AdminConfigResult = {
      Role: role,
      Config: config,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  });
}
