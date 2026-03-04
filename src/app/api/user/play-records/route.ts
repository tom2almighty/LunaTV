/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAllPlayRecords,
  getAllPlayRecords,
  savePlayRecord,
} from '@/lib/db.server';
import { PlayRecord } from '@/lib/types';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonError } from '@/server/api/http';
import { parseResourceIdentity } from '@/server/api/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    const records = await getAllPlayRecords(username);
    return NextResponse.json(records, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('获取播放记录失败', err);
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

    // 验证播放记录数据
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

    await savePlayRecord(
      username,
      identity.source,
      identity.videoId,
      finalRecord,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('保存播放记录失败', err);
    return jsonError('Internal Server Error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = await requireActiveUsername(request);
    await deleteAllPlayRecords(username);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return jsonError(err.message, err.status);
    }
    console.error('删除播放记录失败', err);
    return jsonError('Internal Server Error', 500);
  }
}
