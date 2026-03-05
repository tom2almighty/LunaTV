/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';
import { promisify } from 'util';
import { gunzip } from 'zlib';

import { configSelfCheck, setCachedConfig } from '@/lib/config';
import { SimpleCrypto } from '@/lib/crypto';
import { getDb } from '@/lib/sqlite';

import { executeAdminApiHandler } from '@/server/api/admin-handler';

export const runtime = 'nodejs';

const gunzipAsync = promisify(gunzip);

type BackupUserV2 = {
  username: string;
  password: string;
  playRecords: Array<{
    source: string;
    videoId: string;
    record: Record<string, unknown>;
    updatedAt?: number;
  }>;
  favorites: Array<{
    source: string;
    videoId: string;
    favorite: Record<string, unknown>;
    createdAt?: number;
  }>;
  skipConfigs: Array<{
    source: string;
    videoId: string;
    config: Record<string, unknown>;
  }>;
  searchHistory: Array<{
    keyword: string;
    createdAt?: number;
  }>;
};

type BackupDataV2 = {
  formatVersion: 2;
  createdAt: string;
  app: {
    name: 'LunaTV';
  };
  payload: {
    adminConfig: Record<string, unknown>;
    users: BackupUserV2[];
  };
};

function isValidBackupData(data: unknown): data is BackupDataV2 {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const d = data as BackupDataV2;
  return (
    d.formatVersion === 2 &&
    typeof d.createdAt === 'string' &&
    !!d.payload &&
    Array.isArray(d.payload.users) &&
    !!d.payload.adminConfig
  );
}

export async function POST(request: NextRequest) {
  return executeAdminApiHandler(
    request,
    async () => {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const password = formData.get('password') as string;

        if (!file) {
          return NextResponse.json(
            { error: '请选择备份文件' },
            { status: 400 },
          );
        }

        if (!password) {
          return NextResponse.json(
            { error: '请提供解密密码' },
            { status: 400 },
          );
        }

        if (file.size > 50 * 1024 * 1024) {
          return NextResponse.json(
            { error: '备份文件过大（限制 50MB）' },
            { status: 400 },
          );
        }

        const encryptedData = await file.text();

        let decryptedData: string;
        try {
          decryptedData = SimpleCrypto.decrypt(encryptedData, password);
        } catch {
          return NextResponse.json(
            { error: '解密失败，请检查密码是否正确' },
            { status: 400 },
          );
        }

        const compressedBuffer = Buffer.from(decryptedData, 'base64');
        const decompressedBuffer = await gunzipAsync(compressedBuffer);

        let importData: unknown;
        try {
          importData = JSON.parse(decompressedBuffer.toString());
        } catch {
          return NextResponse.json(
            { error: '备份文件格式错误' },
            { status: 400 },
          );
        }

        if (!isValidBackupData(importData)) {
          return NextResponse.json(
            { error: '备份文件格式无效，或版本不匹配（仅支持 v2）' },
            { status: 400 },
          );
        }

        const db = getDb();
        const checkedAdminConfig = configSelfCheck(
          importData.payload.adminConfig as any,
        );

        const owner = process.env.APP_ADMIN_USERNAME || '';
        const ownerPassword = process.env.APP_ADMIN_PASSWORD || '';

        const userMap = new Map<string, BackupUserV2>();
        for (const user of importData.payload.users) {
          if (!user?.username || !user?.password) {
            continue;
          }
          userMap.set(user.username, user);
        }

        if (owner) {
          const existingOwner = userMap.get(owner);
          if (existingOwner) {
            existingOwner.password = ownerPassword || existingOwner.password;
          } else {
            userMap.set(owner, {
              username: owner,
              password: ownerPassword,
              playRecords: [],
              favorites: [],
              skipConfigs: [],
              searchHistory: [],
            });
          }
        }

        const users = Array.from(userMap.values());

        let playRecordCount = 0;
        let favoriteCount = 0;
        let skipConfigCount = 0;
        let searchHistoryCount = 0;

        const insertTransaction = db.transaction(
          (
            txUsers: BackupUserV2[],
            adminConfig: Record<string, unknown>,
          ): void => {
            db.exec(`
          DELETE FROM users;
          DELETE FROM play_records;
          DELETE FROM favorites;
          DELETE FROM search_history;
          DELETE FROM skip_configs;
          DELETE FROM admin_config;
          DELETE FROM douban_cache;
        `);

            db.prepare(
              `INSERT INTO admin_config (key, value_json) VALUES ('main', ?)
           ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
            ).run(JSON.stringify(adminConfig));

            const insertUser = db.prepare(
              'INSERT INTO users (username, password) VALUES (?, ?)',
            );
            const insertPlayRecord = db.prepare(
              `INSERT INTO play_records (username, source, video_id, record_json, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(username, source, video_id)
           DO UPDATE SET record_json = excluded.record_json, updated_at = excluded.updated_at`,
            );
            const insertFavorite = db.prepare(
              `INSERT INTO favorites (username, source, video_id, favorite_json, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(username, source, video_id)
           DO UPDATE SET favorite_json = excluded.favorite_json, created_at = excluded.created_at`,
            );
            const insertSkipConfig = db.prepare(
              `INSERT INTO skip_configs (username, source, video_id, config_json)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(username, source, video_id)
           DO UPDATE SET config_json = excluded.config_json`,
            );
            const insertSearchHistory = db.prepare(
              `INSERT INTO search_history (username, keyword, created_at)
           VALUES (?, ?, ?)`,
            );

            for (const user of txUsers) {
              insertUser.run(user.username, user.password);

              for (const row of user.playRecords || []) {
                if (!row.source || !row.videoId) {
                  continue;
                }
                insertPlayRecord.run(
                  user.username,
                  row.source,
                  row.videoId,
                  JSON.stringify(row.record || {}),
                  Number(row.updatedAt || Math.floor(Date.now() / 1000)),
                );
                playRecordCount++;
              }

              for (const row of user.favorites || []) {
                if (!row.source || !row.videoId) {
                  continue;
                }
                insertFavorite.run(
                  user.username,
                  row.source,
                  row.videoId,
                  JSON.stringify(row.favorite || {}),
                  Number(row.createdAt || Math.floor(Date.now() / 1000)),
                );
                favoriteCount++;
              }

              for (const row of user.skipConfigs || []) {
                if (!row.source || !row.videoId) {
                  continue;
                }
                insertSkipConfig.run(
                  user.username,
                  row.source,
                  row.videoId,
                  JSON.stringify(row.config || {}),
                );
                skipConfigCount++;
              }

              for (const row of user.searchHistory || []) {
                if (!row.keyword) {
                  continue;
                }
                insertSearchHistory.run(
                  user.username,
                  row.keyword,
                  Number(row.createdAt || Math.floor(Date.now() / 1000)),
                );
                searchHistoryCount++;
              }
            }
          },
        );

        insertTransaction.immediate(
          users,
          checkedAdminConfig as unknown as Record<string, unknown>,
        );

        await setCachedConfig(checkedAdminConfig as any);

        return NextResponse.json({
          message: '数据导入成功',
          formatVersion: 2,
          importedUsers: users.length,
          importedPlayRecords: playRecordCount,
          importedFavorites: favoriteCount,
          importedSkipConfigs: skipConfigCount,
          importedSearchHistory: searchHistoryCount,
          backupCreatedAt: importData.createdAt,
        });
      } catch (error) {
        console.error('数据导入失败:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : '导入失败' },
          { status: 500 },
        );
      }
    },
    {
      ownerOnly: true,
      ownerOnlyMessage: '权限不足，只有站长可以导入数据',
      forbiddenMessage: '权限不足，只有站长可以导入数据',
    },
  );
}
