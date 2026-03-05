/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { saveAdminConfig } from '@/lib/db.server';

import { executeAdminApiHandler } from '@/server/api/admin-handler';
import { ApiValidationError } from '@/server/api/handler';

export const runtime = 'nodejs';

function isProxyMode(value: unknown): value is 'server' | 'preset' | 'custom' {
  return value === 'server' || value === 'preset' || value === 'custom';
}

function isProxyPresetArray(
  value: unknown,
): value is { id: string; name: string; url: string }[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (preset) =>
      typeof preset === 'object' &&
      preset !== null &&
      typeof preset.id === 'string' &&
      typeof preset.name === 'string' &&
      typeof preset.url === 'string',
  );
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizePresetArray(
  value: unknown,
): { id: string; name: string; url: string }[] | null {
  if (!isProxyPresetArray(value)) {
    return null;
  }

  const normalized = value.map((preset) => ({
    id: preset.id.trim(),
    name: preset.name.trim(),
    url: preset.url.trim(),
  }));
  const idSet = new Set<string>();
  for (const preset of normalized) {
    if (!preset.id || !preset.name || !preset.url) {
      return null;
    }
    if (!isHttpUrl(preset.url)) {
      return null;
    }
    if (idSet.has(preset.id)) {
      return null;
    }
    idSet.add(preset.id);
  }

  return normalized;
}

export function validateSiteSettingsPayload(body: unknown): {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  DoubanDataCacheTime: number;
  DoubanDataProxyMode: 'server' | 'preset' | 'custom';
  DoubanDataProxyPresetId: string;
  DoubanDataProxyCustomUrl: string;
  DoubanDataProxyPresets: { id: string; name: string; url: string }[];
  DoubanImageProxyMode: 'server' | 'preset' | 'custom';
  DoubanImageProxyPresetId: string;
  DoubanImageProxyCustomUrl: string;
  DoubanImageProxyPresets: { id: string; name: string; url: string }[];
  DisableYellowFilter: boolean;
  FluidSearch: boolean;
  EnableRegistration: boolean;
  M3U8AdFilterEnabled: boolean;
} {
  const {
    SiteName,
    Announcement,
    SearchDownstreamMaxPage,
    SiteInterfaceCacheTime,
    DoubanDataCacheTime,
    DoubanDataProxyMode,
    DoubanDataProxyPresetId,
    DoubanDataProxyCustomUrl,
    DoubanDataProxyPresets,
    DoubanImageProxyMode,
    DoubanImageProxyPresetId,
    DoubanImageProxyCustomUrl,
    DoubanImageProxyPresets,
    DisableYellowFilter,
    FluidSearch,
    EnableRegistration,
    M3U8AdFilterEnabled,
  } = (body || {}) as Record<string, unknown>;

  const normalizedDataPresets = normalizePresetArray(DoubanDataProxyPresets);
  const normalizedImagePresets = normalizePresetArray(DoubanImageProxyPresets);

  if (
    typeof SiteName !== 'string' ||
    typeof Announcement !== 'string' ||
    typeof SearchDownstreamMaxPage !== 'number' ||
    typeof SiteInterfaceCacheTime !== 'number' ||
    typeof DoubanDataCacheTime !== 'number' ||
    !isProxyMode(DoubanDataProxyMode) ||
    typeof DoubanDataProxyPresetId !== 'string' ||
    typeof DoubanDataProxyCustomUrl !== 'string' ||
    normalizedDataPresets === null ||
    !isProxyMode(DoubanImageProxyMode) ||
    typeof DoubanImageProxyPresetId !== 'string' ||
    typeof DoubanImageProxyCustomUrl !== 'string' ||
    normalizedImagePresets === null ||
    typeof DisableYellowFilter !== 'boolean' ||
    typeof FluidSearch !== 'boolean' ||
    typeof EnableRegistration !== 'boolean' ||
    typeof M3U8AdFilterEnabled !== 'boolean'
  ) {
    throw new ApiValidationError('参数格式错误');
  }

  return {
    SiteName,
    Announcement,
    SearchDownstreamMaxPage,
    SiteInterfaceCacheTime,
    DoubanDataCacheTime,
    DoubanDataProxyMode,
    DoubanDataProxyPresetId,
    DoubanDataProxyCustomUrl,
    DoubanDataProxyPresets: normalizedDataPresets,
    DoubanImageProxyMode,
    DoubanImageProxyPresetId,
    DoubanImageProxyCustomUrl,
    DoubanImageProxyPresets: normalizedImagePresets,
    DisableYellowFilter,
    FluidSearch,
    EnableRegistration,
    M3U8AdFilterEnabled,
  };
}

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(request, async () => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiValidationError('请求体格式错误');
    }
    const validatedBody = validateSiteSettingsPayload(body);

    const adminConfig = await getConfig();
    adminConfig.SiteConfig = {
      ...validatedBody,
    };

    await saveAdminConfig(adminConfig);
    revalidatePath('/', 'layout');

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
