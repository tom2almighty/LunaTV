import { getDb, SQLiteDatabase } from '@/lib/sqlite';
import { Favorite, PlayRecord, SkipConfig } from '@/lib/types';

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

async function getPlayRecord(
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

async function savePlayRecord(
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

async function getAllPlayRecords(
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

async function deletePlayRecord(
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

async function deleteAllPlayRecords(username: string): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM play_records WHERE username = ?', [username]);
}

async function getFavorite(
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

async function saveFavorite(
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

async function getAllFavorites(
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

async function deleteFavorite(
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

async function deleteAllFavorites(username: string): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM favorites WHERE username = ?', [username]);
}

async function getSearchHistory(username: string): Promise<string[]> {
  const db = getDb();
  const rows = allRows<{ keyword: string }[]>(
    db,
    'SELECT keyword FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?',
    [username, SEARCH_HISTORY_LIMIT],
  );
  return rows.map((r) => r.keyword);
}

async function addSearchHistory(
  username: string,
  keyword: string,
): Promise<void> {
  const db = getDb();
  run(db, 'DELETE FROM search_history WHERE username = ? AND keyword = ?', [
    username,
    keyword,
  ]);
  run(db, 'INSERT INTO search_history (username, keyword) VALUES (?, ?)', [
    username,
    keyword,
  ]);
  run(
    db,
    `DELETE FROM search_history WHERE username = ? AND id NOT IN (
      SELECT id FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?
    )`,
    [username, username, SEARCH_HISTORY_LIMIT],
  );
}

async function deleteSearchHistory(
  username: string,
  keyword?: string,
): Promise<void> {
  const db = getDb();
  if (keyword) {
    run(db, 'DELETE FROM search_history WHERE username = ? AND keyword = ?', [
      username,
      keyword,
    ]);
    return;
  }
  run(db, 'DELETE FROM search_history WHERE username = ?', [username]);
}

async function getSkipConfig(
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

async function setSkipConfig(
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

async function deleteSkipConfig(
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

async function getAllSkipConfigs(
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

export const userDataRepository = {
  getPlayRecord,
  savePlayRecord,
  getAllPlayRecords,
  deletePlayRecord,
  deleteAllPlayRecords,
  getFavorite,
  saveFavorite,
  getAllFavorites,
  deleteFavorite,
  deleteAllFavorites,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistory,
  getSkipConfig,
  setSkipConfig,
  deleteSkipConfig,
  getAllSkipConfigs,
};
