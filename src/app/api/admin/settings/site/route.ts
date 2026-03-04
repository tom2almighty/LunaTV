/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { saveAdminConfig } from '@/lib/db.server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(request, async () => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }

    const {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanDataCacheTime,
      DoubanProxyType,
      DoubanProxy,
      DoubanImageProxyType,
      DoubanImageProxy,
      DisableYellowFilter,
      FluidSearch,
      EnableRegistration,
      M3U8AdFilterEnabled,
    } = body as {
      SiteName: string;
      Announcement: string;
      SearchDownstreamMaxPage: number;
      SiteInterfaceCacheTime: number;
      DoubanDataCacheTime: number;
      DoubanProxyType: string;
      DoubanProxy: string;
      DoubanImageProxyType: string;
      DoubanImageProxy: string;
      DisableYellowFilter: boolean;
      FluidSearch: boolean;
      EnableRegistration: boolean;
      M3U8AdFilterEnabled: boolean;
    };

    if (
      typeof SiteName !== 'string' ||
      typeof Announcement !== 'string' ||
      typeof SearchDownstreamMaxPage !== 'number' ||
      typeof SiteInterfaceCacheTime !== 'number' ||
      typeof DoubanDataCacheTime !== 'number' ||
      typeof DoubanProxyType !== 'string' ||
      typeof DoubanProxy !== 'string' ||
      typeof DoubanImageProxyType !== 'string' ||
      typeof DoubanImageProxy !== 'string' ||
      typeof DisableYellowFilter !== 'boolean' ||
      typeof FluidSearch !== 'boolean' ||
      typeof EnableRegistration !== 'boolean' ||
      typeof M3U8AdFilterEnabled !== 'boolean'
    ) {
      throw new ApiValidationError('参数格式错误');
    }

    const adminConfig = await getConfig();
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanDataCacheTime,
      DoubanProxyType,
      DoubanProxy,
      DoubanImageProxyType,
      DoubanImageProxy,
      DisableYellowFilter,
      FluidSearch,
      EnableRegistration,
      M3U8AdFilterEnabled,
    };

    await saveAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  });
}
