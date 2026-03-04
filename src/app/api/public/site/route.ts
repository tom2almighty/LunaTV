/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('public site called: ', request.url);

  const config = await getConfig();
  const result = {
    SiteName: config.SiteConfig.SiteName,
    EnableRegistration: config.SiteConfig.EnableRegistration || false,
    M3U8AdFilterEnabled: config.SiteConfig.M3U8AdFilterEnabled !== false,
  };
  return NextResponse.json(result);
}
