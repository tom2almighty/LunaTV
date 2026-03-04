/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAllFavorites,
  getAllFavorites,
  saveFavorite,
} from '@/lib/db.server';
import { Favorite } from '@/lib/types';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    const favorites = await getAllFavorites(username);
    return NextResponse.json(favorites, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('获取收藏失败', err);
    return jsonError('Internal Server Error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    const body = await request.json();
    const {
      key,
      source,
      videoId,
      favorite,
    }: {
      key?: string;
      source?: string;
      videoId?: string;
      favorite?: Favorite;
    } = body;

    if (!favorite) {
      return NextResponse.json({ error: 'Missing favorite' }, { status: 400 });
    }

    if (!favorite.title || !favorite.source_name) {
      return NextResponse.json(
        { error: 'Invalid favorite data' },
        { status: 400 },
      );
    }

    let resolvedSource = source;
    let resolvedVideoId = videoId;
    if (key && (!resolvedSource || !resolvedVideoId)) {
      const [s, v] = key.split('+');
      resolvedSource = s;
      resolvedVideoId = v;
    }

    let identity: { source: string; videoId: string };
    try {
      identity = parseResourceIdentity(resolvedSource, resolvedVideoId);
    } catch {
      return jsonError('Invalid resource identity', 400);
    }

    const finalFavorite = {
      ...favorite,
      save_time: favorite.save_time ?? Date.now(),
    } as Favorite;

    await saveFavorite(
      username,
      identity.source,
      identity.videoId,
      finalFavorite,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('保存收藏失败', err);
    return jsonError('Internal Server Error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    await deleteAllFavorites(username);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('删除收藏失败', err);
    return jsonError('Internal Server Error', 500);
  }
}
