/* eslint-disable no-console */

import { AdminConfig } from './admin.types';
import { getDb } from './sqlite';
import { Favorite, PlayRecord, SkipConfig } from './types';

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 工具函数：解析存储key
export function parseStorageKey(key: string): {
  source: string;
  videoId: string;
} {
  const plusIndex = key.indexOf('+');
  return {
    source: key.slice(0, plusIndex),
    videoId: key.slice(plusIndex + 1),
  };
}

// ==================== 用户相关 ====================

export async function registerUser(
  username: string,
  password: string,
): Promise<void> {
  const db = await getDb();
  await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [
    username,
    password,
  ]);
}

export async function verifyUser(
  username: string,
  password: string,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.get<{ password: string }>(
    'SELECT password FROM users WHERE username = ?',
    [username],
  );
  return row?.password === password;
}

export async function checkUserExist(username: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.get('SELECT 1 FROM users WHERE username = ?', [
    username,
  ]);
  return !!row;
}

export async function changePassword(
  username: string,
  newPassword: string,
): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE users SET password = ? WHERE username = ?', [
    newPassword,
    username,
  ]);
}

export async function deleteUser(username: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM users WHERE username = ?', [username]);
  await db.run('DELETE FROM play_records WHERE username = ?', [username]);
  await db.run('DELETE FROM favorites WHERE username = ?', [username]);
  await db.run('DELETE FROM search_history WHERE username = ?', [username]);
  await db.run('DELETE FROM skip_configs WHERE username = ?', [username]);
}

export async function getAllUsers(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.all<{ username: string }[]>(
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
  const db = await getDb();
  const row = await db.get<{ record_json: string }>(
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
  const db = await getDb();
  await db.run(
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
  const db = await getDb();
  const rows = await db.all<
    { source: string; video_id: string; record_json: string }[]
  >(
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
  const db = await getDb();
  await db.run(
    'DELETE FROM play_records WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
}

export async function deleteAllPlayRecords(username: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM play_records WHERE username = ?', [username]);
}

// ==================== 收藏 ====================

export async function getFavorite(
  username: string,
  source: string,
  videoId: string,
): Promise<Favorite | null> {
  const db = await getDb();
  const row = await db.get<{ favorite_json: string }>(
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
  const db = await getDb();
  await db.run(
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
  const db = await getDb();
  const rows = await db.all<
    { source: string; video_id: string; favorite_json: string }[]
  >(
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
  const db = await getDb();
  await db.run(
    'DELETE FROM favorites WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
}

export async function deleteAllFavorites(username: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM favorites WHERE username = ?', [username]);
}

// ==================== 搜索历史 ====================

export async function getSearchHistory(username: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.all<{ keyword: string }[]>(
    'SELECT keyword FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?',
    [username, SEARCH_HISTORY_LIMIT],
  );
  return rows.map((r) => r.keyword);
}

export async function addSearchHistory(
  username: string,
  keyword: string,
): Promise<void> {
  const db = await getDb();
  // 先删除已存在的相同关键词
  await db.run(
    'DELETE FROM search_history WHERE username = ? AND keyword = ?',
    [username, keyword],
  );
  // 插入新记录
  await db.run('INSERT INTO search_history (username, keyword) VALUES (?, ?)', [
    username,
    keyword,
  ]);
  // 清理超出限制的旧记录
  await db.run(
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
  const db = await getDb();
  if (keyword) {
    await db.run(
      'DELETE FROM search_history WHERE username = ? AND keyword = ?',
      [username, keyword],
    );
  } else {
    await db.run('DELETE FROM search_history WHERE username = ?', [username]);
  }
}

// ==================== 跳过片头片尾配置 ====================

export async function getSkipConfig(
  username: string,
  source: string,
  videoId: string,
): Promise<SkipConfig | null> {
  const db = await getDb();
  const row = await db.get<{ config_json: string }>(
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
  const db = await getDb();
  await db.run(
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
  const db = await getDb();
  await db.run(
    'DELETE FROM skip_configs WHERE username = ? AND source = ? AND video_id = ?',
    [username, source, videoId],
  );
}

export async function getAllSkipConfigs(
  username: string,
): Promise<Record<string, SkipConfig>> {
  const db = await getDb();
  const rows = await db.all<
    { source: string; video_id: string; config_json: string }[]
  >(
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
  const db = await getDb();
  const row = await db.get<{ value_json: string }>(
    "SELECT value_json FROM admin_config WHERE key = 'main'",
  );
  return row ? JSON.parse(row.value_json) : null;
}

export async function saveAdminConfig(config: AdminConfig): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO admin_config (key, value_json) VALUES ('main', ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
    [JSON.stringify(config)],
  );
}

// ==================== 豆瓣缓存 ====================

export async function getDoubanCache<T>(cacheKey: string): Promise<T | null> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = await db.get<{ data_json: string }>(
    'SELECT data_json FROM douban_cache WHERE cache_key = ? AND expires_at > ?',
    [cacheKey, now],
  );
  return row ? JSON.parse(row.data_json) : null;
}

export async function setDoubanCache(
  cacheKey: string,
  data: unknown,
  expireSeconds: number,
): Promise<void> {
  const db = await getDb();
  const expiresAt = Math.floor(Date.now() / 1000) + expireSeconds;
  await db.run(
    `INSERT INTO douban_cache (cache_key, data_json, expires_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET data_json = excluded.data_json, expires_at = excluded.expires_at`,
    [cacheKey, JSON.stringify(data), expiresAt],
  );
}

export async function cleanExpiredDoubanCache(): Promise<number> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = await db.run(
    'DELETE FROM douban_cache WHERE expires_at <= ?',
    [now],
  );
  return result.changes || 0;
}

// ==================== 数据清理 ====================

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM users');
  await db.run('DELETE FROM play_records');
  await db.run('DELETE FROM favorites');
  await db.run('DELETE FROM search_history');
  await db.run('DELETE FROM skip_configs');
  await db.run('DELETE FROM admin_config');
  await db.run('DELETE FROM douban_cache');
  console.log('所有数据已清空');
}
