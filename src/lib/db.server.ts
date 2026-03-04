/* eslint-disable no-console */

import { AdminConfig } from './admin.types';
import { getDb, SQLiteDatabase } from './sqlite';
import { Favorite, PlayRecord, SkipConfig } from './types';

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

type QueryParams = unknown[];

function run(
  db: SQLiteDatabase,
  sql: string,
  params: QueryParams = [],
): { changes: number } {
  return db.prepare(sql).run(...params);
}

function getRow<T>(
  db: SQLiteDatabase,
  sql: string,
  params: QueryParams = [],
): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

function allRows<T>(
  db: SQLiteDatabase,
  sql: string,
  params: QueryParams = [],
): T {
  return db.prepare(sql).all(...params) as T;
}

// ==================== 用户相关 ====================

export async function registerUser(
  username: string,
  password: string,
): Promise<void> {
  const db = getDb();
  run(db, 'INSERT INTO users (username, password) VALUES (?, ?)', [
    username,
    password,
  ]);
}

export async function verifyUser(
  username: string,
  password: string,
): Promise<boolean> {
  const db = getDb();
  const row = getRow<{ password: string }>(
    db,
    'SELECT password FROM users WHERE username = ?',
    [username],
  );
  return row?.password === password;
}

export async function checkUserExist(username: string): Promise<boolean> {
  const db = getDb();
  const row = getRow(db, 'SELECT 1 FROM users WHERE username = ?', [username]);
  return !!row;
}

export async function changePassword(
  username: string,
  newPassword: string,
): Promise<void> {
  const db = getDb();
  run(db, 'UPDATE users SET password = ? WHERE username = ?', [
    newPassword,
    username,
  ]);
}

export async function deleteUser(username: string): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM users WHERE username = ?', [username]);
  run(db, 'DELETE FROM play_records WHERE username = ?', [username]);
  run(db, 'DELETE FROM favorites WHERE username = ?', [username]);
  run(db, 'DELETE FROM search_history WHERE username = ?', [username]);
  run(db, 'DELETE FROM skip_configs WHERE username = ?', [username]);
}

export async function getAllUsers(): Promise<string[]> {
  const db = getDb();
  const rows = allRows<{ username: string }[]>(
    db,
    'SELECT username FROM users',
  );
  return rows.map((r) => r.username);
}

// ==================== 播放记录 ====================

export async function getPlayRecord(
  username: string,
  source: string,
  videoId: string,
): Promise<PlayRecord | null> {
  const db = getDb();
  const row = getRow<{ record_json: string }>(
    db,
    'SELECT record_json FROM play_records WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
  return row ? JSON.parse(row.record_json) : null;
}

export async function savePlayRecord(
  username: string,
  source: string,
  videoId: string,
  record: PlayRecord,
): Promise<void> {
  const db = getDb();
  run(
    db,
    `INSERT INTO play_records (username, source, video_id, record_json, updated_at)
     VALUES (?, ?, ?, ?, strftime('%s', 'now'))
     ON CONFLICT(username, source, video_id)
     DO UPDATE SET record_json = excluded.record_json, updated_at = excluded.updated_at`,
    [username, source, videoId, JSON.stringify(record)],
  );
}

export async function getAllPlayRecords(
  username: string,
): Promise<Record<string, PlayRecord>> {
  const db = getDb();
  const rows = allRows<
    { source: string; video_id: string; record_json: string }[]
  >(
    db,
    'SELECT source, video_id, record_json FROM play_records WHERE username = ?',
    [username],
  );
  const result: Record<string, PlayRecord> = {};
  for (const row of rows) {
    const key = `${row.source}+${row.video_id}`;
    result[key] = JSON.parse(row.record_json);
  }
  return result;
}

export async function deletePlayRecord(
  username: string,
  source: string,
  videoId: string,
): Promise<void> {
  const db = getDb();
  run(
    db,
    'DELETE FROM play_records WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
}

export async function deleteAllPlayRecords(username: string): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM play_records WHERE username = ?', [username]);
}

// ==================== 收藏 ====================

export async function getFavorite(
  username: string,
  source: string,
  videoId: string,
): Promise<Favorite | null> {
  const db = getDb();
  const row = getRow<{ favorite_json: string }>(
    db,
    'SELECT favorite_json FROM favorites WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
  return row ? JSON.parse(row.favorite_json) : null;
}

export async function saveFavorite(
  username: string,
  source: string,
  videoId: string,
  favorite: Favorite,
): Promise<void> {
  const db = getDb();
  run(
    db,
    `INSERT INTO favorites (username, source, video_id, favorite_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(username, source, video_id)
     DO UPDATE SET favorite_json = excluded.favorite_json`,
    [username, source, videoId, JSON.stringify(favorite)],
  );
}

export async function getAllFavorites(
  username: string,
): Promise<Record<string, Favorite>> {
  const db = getDb();
  const rows = allRows<
    { source: string; video_id: string; favorite_json: string }[]
  >(
    db,
    'SELECT source, video_id, favorite_json FROM favorites WHERE username = ?',
    [username],
  );
  const result: Record<string, Favorite> = {};
  for (const row of rows) {
    const key = `${row.source}+${row.video_id}`;
    result[key] = JSON.parse(row.favorite_json);
  }
  return result;
}

export async function deleteFavorite(
  username: string,
  source: string,
  videoId: string,
): Promise<void> {
  const db = getDb();
  run(
    db,
    'DELETE FROM favorites WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
}

export async function deleteAllFavorites(username: string): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM favorites WHERE username = ?', [username]);
}

// ==================== 搜索历史 ====================

export async function getSearchHistory(username: string): Promise<string[]> {
  const db = getDb();
  const rows = allRows<{ keyword: string }[]>(
    db,
    'SELECT keyword FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?',
    [username, SEARCH_HISTORY_LIMIT],
  );
  return rows.map((r) => r.keyword);
}

export async function addSearchHistory(
  username: string,
  keyword: string,
): Promise<void> {
  const db = getDb();
  // 先删除已存在的相同关键词
  run(db, 'DELETE FROM search_history WHERE username = ? AND keyword = ?', [
    username,
    keyword,
  ]);
  // 插入新记录
  run(db, 'INSERT INTO search_history (username, keyword) VALUES (?, ?)', [
    username,
    keyword,
  ]);
  // 清理超出限制的旧记录
  run(
    db,
    `DELETE FROM search_history WHERE username = ? AND id NOT IN (
      SELECT id FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?
    )`,
    [username, username, SEARCH_HISTORY_LIMIT],
  );
}

export async function deleteSearchHistory(
  username: string,
  keyword?: string,
): Promise<void> {
  const db = getDb();
  if (keyword) {
    run(db, 'DELETE FROM search_history WHERE username = ? AND keyword = ?', [
      username,
      keyword,
    ]);
  } else {
    run(db, 'DELETE FROM search_history WHERE username = ?', [username]);
  }
}

// ==================== 跳过片头片尾配置 ====================

export async function getSkipConfig(
  username: string,
  source: string,
  videoId: string,
): Promise<SkipConfig | null> {
  const db = getDb();
  const row = getRow<{ config_json: string }>(
    db,
    'SELECT config_json FROM skip_configs WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
  return row ? JSON.parse(row.config_json) : null;
}

export async function setSkipConfig(
  username: string,
  source: string,
  videoId: string,
  config: SkipConfig,
): Promise<void> {
  const db = getDb();
  run(
    db,
    `INSERT INTO skip_configs (username, source, video_id, config_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(username, source, video_id)
     DO UPDATE SET config_json = excluded.config_json`,
    [username, source, videoId, JSON.stringify(config)],
  );
}

export async function deleteSkipConfig(
  username: string,
  source: string,
  videoId: string,
): Promise<void> {
  const db = getDb();
  run(
    db,
    'DELETE FROM skip_configs WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
}

export async function getAllSkipConfigs(
  username: string,
): Promise<Record<string, SkipConfig>> {
  const db = getDb();
  const rows = allRows<
    { source: string; video_id: string; config_json: string }[]
  >(
    db,
    'SELECT source, video_id, config_json FROM skip_configs WHERE username = ?',
    [username],
  );
  const result: Record<string, SkipConfig> = {};
  for (const row of rows) {
    const key = `${row.source}+${row.video_id}`;
    result[key] = JSON.parse(row.config_json);
  }
  return result;
}

// ==================== 管理员配置 ====================

export async function getAdminConfig(): Promise<AdminConfig | null> {
  const db = getDb();
  const row = getRow<{ value_json: string }>(
    db,
    "SELECT value_json FROM admin_config WHERE key = 'main'",
  );
  return row ? JSON.parse(row.value_json) : null;
}

export async function saveAdminConfig(config: AdminConfig): Promise<void> {
  const db = getDb();
  run(
    db,
    `INSERT INTO admin_config (key, value_json) VALUES ('main', ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
    [JSON.stringify(config)],
  );
}

// ==================== 豆瓣缓存 ====================

export async function getDoubanCache<T>(cacheKey: {
  kind: string;
  category: string;
  type: string;
  pageStart: number;
  pageLimit: number;
}): Promise<T | null> {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = getRow<{ payload_json: string }>(
    db,
    `SELECT payload_json
     FROM douban_cache
     WHERE kind = ?
       AND category = ?
       AND type = ?
       AND page_start = ?
       AND page_limit = ?
       AND expires_at > ?`,
    [
      cacheKey.kind,
      cacheKey.category,
      cacheKey.type,
      cacheKey.pageStart,
      cacheKey.pageLimit,
      now,
    ],
  );
  return row ? JSON.parse(row.payload_json) : null;
}

export async function setDoubanCache(
  cacheKey: {
    kind: string;
    category: string;
    type: string;
    pageStart: number;
    pageLimit: number;
  },
  data: unknown,
  expireSeconds: number,
): Promise<void> {
  const db = getDb();
  const expiresAt = Math.floor(Date.now() / 1000) + expireSeconds;
  run(
    db,
    `INSERT INTO douban_cache (
      kind,
      category,
      type,
      page_start,
      page_limit,
      payload_json,
      expires_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    ON CONFLICT(kind, category, type, page_start, page_limit)
    DO UPDATE SET
      payload_json = excluded.payload_json,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at`,
    [
      cacheKey.kind,
      cacheKey.category,
      cacheKey.type,
      cacheKey.pageStart,
      cacheKey.pageLimit,
      JSON.stringify(data),
      expiresAt,
    ],
  );
}

export async function cleanExpiredDoubanCache(): Promise<number> {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = run(db, 'DELETE FROM douban_cache WHERE expires_at <= ?', [
    now,
  ]);
  return result.changes || 0;
}

// ==================== 数据清理 ====================

export async function clearAllData(): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM users');
  run(db, 'DELETE FROM play_records');
  run(db, 'DELETE FROM favorites');
  run(db, 'DELETE FROM search_history');
  run(db, 'DELETE FROM skip_configs');
  run(db, 'DELETE FROM admin_config');
  run(db, 'DELETE FROM douban_cache');
  console.log('所有数据已清空');
}
