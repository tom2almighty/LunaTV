/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';
import { promisify } from 'util';
import { gzip } from 'zlib';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { SimpleCrypto } from '@/lib/crypto';
import { getAdminConfig } from '@/lib/db.server';
import { getDb } from '@/lib/sqlite';

export const runtime = 'nodejs';

const gzipAsync = promisify(gzip);

type BackupUserV2 = {
  username: string;
  password: string;
  playRecords: Array<{
    source: string;
    videoId: string;
    record: Record<string, unknown>;
    updatedAt: number;
  }>;
  favorites: Array<{
    source: string;
    videoId: string;
    favorite: Record<string, unknown>;
    createdAt: number;
  }>;
  skipConfigs: Array<{
    source: string;
    videoId: string;
    config: Record<string, unknown>;
  }>;
  searchHistory: Array<{
    keyword: string;
    createdAt: number;
  }>;
};

type BackupDataV2 = {
  formatVersion: 2;
  createdAt: string;
  app: {
    name: 'LunaTV';
  };
  payload: {
    adminConfig: any;
    users: BackupUserV2[];
  };
};

function parseJsonSafe<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (authInfo.username !== process.env.APP_ADMIN_USERNAME) {
      return NextResponse.json(
        { error: '权限不足，只有站长可以导出数据' },
        { status: 401 },
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '请提供加密密码' }, { status: 400 });
    }

    const adminConfig = await getAdminConfig();
    if (!adminConfig) {
      return NextResponse.json({ error: '无法获取配置' }, { status: 500 });
    }

    const db = getDb();
    const userRows = db
      .prepare('SELECT username, password FROM users')
      .all() as Array<{ username: string; password: string }>;

    const owner = process.env.APP_ADMIN_USERNAME || '';
    const ownerPassword = process.env.APP_ADMIN_PASSWORD || '';
    if (owner && !userRows.some((u) => u.username === owner)) {
      userRows.push({ username: owner, password: ownerPassword });
    }

    const selectPlayRows = db.prepare(
      'SELECT source, video_id, record_json, updated_at FROM play_records WHERE username = ?',
    );
    const selectFavoriteRows = db.prepare(
      'SELECT source, video_id, favorite_json, created_at FROM favorites WHERE username = ?',
    );
    const selectSkipRows = db.prepare(
      'SELECT source, video_id, config_json FROM skip_configs WHERE username = ?',
    );
    const selectHistoryRows = db.prepare(
      'SELECT keyword, created_at FROM search_history WHERE username = ? ORDER BY created_at ASC, id ASC',
    );

    const users: BackupUserV2[] = userRows.map((user) => {
      const playRows = selectPlayRows.all(user.username) as Array<{
        source: string;
        video_id: string;
        record_json: string;
        updated_at: number;
      }>;

      const favRows = selectFavoriteRows.all(user.username) as Array<{
        source: string;
        video_id: string;
        favorite_json: string;
        created_at: number;
      }>;

      const skipRows = selectSkipRows.all(user.username) as Array<{
        source: string;
        video_id: string;
        config_json: string;
      }>;

      const historyRows = selectHistoryRows.all(user.username) as Array<{
        keyword: string;
        created_at: number;
      }>;

      return {
        username: user.username,
        password:
          user.username === owner && ownerPassword ? ownerPassword : user.password,
        playRecords: playRows.map((row) => ({
          source: row.source,
          videoId: row.video_id,
          record: parseJsonSafe<Record<string, unknown>>(row.record_json, {}),
          updatedAt: Number(row.updated_at || 0),
        })),
        favorites: favRows.map((row) => ({
          source: row.source,
          videoId: row.video_id,
          favorite: parseJsonSafe<Record<string, unknown>>(row.favorite_json, {}),
          createdAt: Number(row.created_at || 0),
        })),
        skipConfigs: skipRows.map((row) => ({
          source: row.source,
          videoId: row.video_id,
          config: parseJsonSafe<Record<string, unknown>>(row.config_json, {}),
        })),
        searchHistory: historyRows.map((row) => ({
          keyword: row.keyword,
          createdAt: Number(row.created_at || 0),
        })),
      };
    });

    const exportData: BackupDataV2 = {
      formatVersion: 2,
      createdAt: new Date().toISOString(),
      app: {
        name: 'LunaTV',
      },
      payload: {
        adminConfig,
        users,
      },
    };

    const compressedData = await gzipAsync(JSON.stringify(exportData));
    const encryptedData = SimpleCrypto.encrypt(
      compressedData.toString('base64'),
      password,
    );

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `lunatv-backup-v2-${timestamp}.dat`;

    return new NextResponse(encryptedData, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': encryptedData.length.toString(),
      },
    });
  } catch (error) {
    console.error('数据导出失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 },
    );
  }
}

