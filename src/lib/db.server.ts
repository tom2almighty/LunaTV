/* eslint-disable no-console */

import { userDataRepository } from '@/server/repositories/user-data-repository';

import { AdminConfig } from './admin.types';
import { hashPassword, verifyPassword } from './security/password';
import { getDb, SQLiteDatabase } from './sqlite';
import { Favorite, PlayRecord, SkipConfig } from './types';

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
  const passwordHash = hashPassword(password);
  run(db, 'INSERT INTO users (username, password) VALUES (?, ?)', [
    username,
    passwordHash,
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
  if (!row) {
    return false;
  }

  return verifyPassword(password, row.password);
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
  const passwordHash = hashPassword(newPassword);
  run(db, 'UPDATE users SET password = ? WHERE username = ?', [
    passwordHash,
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
  return userDataRepository.getPlayRecord(username, source, videoId);
}

export async function savePlayRecord(
  username: string,
  source: string,
  videoId: string,
  record: PlayRecord,
): Promise<void> {
  return userDataRepository.savePlayRecord(username, source, videoId, record);
}

export async function getAllPlayRecords(
  username: string,
): Promise<Record<string, PlayRecord>> {
  return userDataRepository.getAllPlayRecords(username);
}

export async function deletePlayRecord(
  username: string,
  source: string,
  videoId: string,
): Promise<void> {
  return userDataRepository.deletePlayRecord(username, source, videoId);
}

export async function deleteAllPlayRecords(username: string): Promise<void> {
  return userDataRepository.deleteAllPlayRecords(username);
}

// ==================== 收藏 ====================

export async function getFavorite(
  username: string,
  source: string,
  videoId: string,
): Promise<Favorite | null> {
  return userDataRepository.getFavorite(username, source, videoId);
}

export async function saveFavorite(
  username: string,
  source: string,
  videoId: string,
  favorite: Favorite,
): Promise<void> {
  return userDataRepository.saveFavorite(username, source, videoId, favorite);
}

export async function getAllFavorites(
  username: string,
): Promise<Record<string, Favorite>> {
  return userDataRepository.getAllFavorites(username);
}

export async function deleteFavorite(
  username: string,
  source: string,
  videoId: string,
): Promise<void> {
  return userDataRepository.deleteFavorite(username, source, videoId);
}

export async function deleteAllFavorites(username: string): Promise<void> {
  return userDataRepository.deleteAllFavorites(username);
}

// ==================== 搜索历史 ====================

export async function getSearchHistory(username: string): Promise<string[]> {
  return userDataRepository.getSearchHistory(username);
}

export async function addSearchHistory(
  username: string,
  keyword: string,
): Promise<void> {
  return userDataRepository.addSearchHistory(username, keyword);
}

export async function deleteSearchHistory(
  username: string,
  keyword?: string,
): Promise<void> {
  return userDataRepository.deleteSearchHistory(username, keyword);
}

// ==================== 跳过片头片尾配置 ====================

export async function getSkipConfig(
  username: string,
  source: string,
  videoId: string,
): Promise<SkipConfig | null> {
  return userDataRepository.getSkipConfig(username, source, videoId);
}

export async function setSkipConfig(
  username: string,
  source: string,
  videoId: string,
  config: SkipConfig,
): Promise<void> {
  return userDataRepository.setSkipConfig(username, source, videoId, config);
}

export async function deleteSkipConfig(
  username: string,
  source: string,
  videoId: string,
): Promise<void> {
  return userDataRepository.deleteSkipConfig(username, source, videoId);
}

export async function getAllSkipConfigs(
  username: string,
): Promise<Record<string, SkipConfig>> {
  return userDataRepository.getAllSkipConfigs(username);
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
  run(db, 'DELETE FROM play_sessions');
  run(db, 'DELETE FROM admin_config');
  run(db, 'DELETE FROM douban_cache');
  console.log('所有数据已清空');
}
