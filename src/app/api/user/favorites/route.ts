/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAllFavorites,
  getAllFavorites,
  saveFavorite,
} from '@/lib/db.server';
import { Favorite } from '@/lib/types';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const favorites = await getAllFavorites(username as string);
      return favorites;
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}

export async function POST(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
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
        return NextResponse.json(
          { error: 'Missing favorite' },
          { status: 400 },
        );
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
        username as string,
        identity.source,
        identity.videoId,
        finalFavorite,
      );

      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}

export async function DELETE(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      await deleteAllFavorites(username as string);
      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}
