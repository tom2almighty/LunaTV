/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { PlayRecord } from '@/lib/types';

import { executeApiHandler } from '@/server/api/handler';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';
import { userDataRepository } from '@/server/repositories/user-data-repository';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const records = await userDataRepository.getAllPlayRecords(
        username as string,
      );
      return records;
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
        record,
      }: {
        key?: string;
        source?: string;
        videoId?: string;
        record?: PlayRecord;
      } = body;

      if (!record) {
        return NextResponse.json({ error: 'Missing record' }, { status: 400 });
      }

      if (!record.title || !record.source_name || record.index < 1) {
        return NextResponse.json(
          { error: 'Invalid record data' },
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

      const finalRecord = {
        ...record,
        save_time: record.save_time ?? Date.now(),
      } as PlayRecord;

      await userDataRepository.savePlayRecord(
        username as string,
        identity.source,
        identity.videoId,
        finalRecord,
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
      await userDataRepository.deleteAllPlayRecords(username as string);
      return { success: true };
    },
    { requireAuth: true, responseShape: 'raw' },
  );
}
