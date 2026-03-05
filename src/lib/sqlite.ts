/* eslint-disable no-console */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// 数据库文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'sqlite.db');

export type SQLiteDatabase = Database.Database;

// 全局数据库实例
let dbInstance: SQLiteDatabase | null = null;

/**
 * 确保 data 目录存在
 */
function ensureDataDir(): void {
  try {
    const stat = fs.statSync(DATA_DIR);
    if (!stat.isDirectory()) {
      throw new Error(`${DATA_DIR} 存在但不是目录`);
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`创建数据目录: ${DATA_DIR}`);
    } else {
      throw err;
    }
  }

  // 检查数据库文件是否被误创建为目录
  try {
    const dbStat = fs.statSync(DB_PATH);
    if (dbStat.isDirectory()) {
      console.error(`错误: ${DB_PATH} 是一个目录，请删除后重试`);
      throw new Error(`${DB_PATH} 是一个目录而非文件`);
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code !== 'ENOENT'
    ) {
      throw err;
    }
    // 文件不存在是正常的，会自动创建
  }
}

/**
 * 初始化数据库表结构
 */
function initTables(db: SQLiteDatabase): void {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 播放记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS play_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      source TEXT NOT NULL,
      video_id TEXT NOT NULL,
      record_json TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(username, source, video_id)
    )
  `);

  // 收藏表
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      source TEXT NOT NULL,
      video_id TEXT NOT NULL,
      favorite_json TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(username, source, video_id)
    )
  `);

  // 搜索历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      keyword TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 跳过片头片尾配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS skip_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      source TEXT NOT NULL,
      video_id TEXT NOT NULL,
      config_json TEXT NOT NULL,
      UNIQUE(username, source, video_id)
    )
  `);

  // 管理员配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    )
  `);

  // 播放会话表（持久化播放上下文）
  db.exec(`
    CREATE TABLE IF NOT EXISTS play_sessions (
      session_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  ensureDoubanCacheTable(db);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_play_records_username ON play_records(username);
    CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
    CREATE INDEX IF NOT EXISTS idx_search_history_username_created_at ON search_history(username, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_skip_configs_username ON skip_configs(username);
    CREATE INDEX IF NOT EXISTS idx_play_sessions_username ON play_sessions(username);
    CREATE INDEX IF NOT EXISTS idx_play_sessions_expires_at ON play_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_play_sessions_updated_at ON play_sessions(updated_at);
  `);

  console.log('数据库表初始化完成');
}

function ensureDoubanCacheTable(db: SQLiteDatabase): void {
  const expectedColumns = [
    'kind',
    'category',
    'type',
    'page_start',
    'page_limit',
    'payload_json',
    'expires_at',
    'updated_at',
  ];

  const tableInfo = db
    .prepare('PRAGMA table_info(douban_cache)')
    .all() as Array<{ name: string }>;

  const hasSchemaMismatch =
    tableInfo.length > 0 &&
    (tableInfo.length !== expectedColumns.length ||
      expectedColumns.some(
        (columnName) => !tableInfo.some((col) => col.name === columnName),
      ));

  // 豆瓣缓存表只存临时数据，检测到旧结构时直接重建。
  if (hasSchemaMismatch) {
    db.exec('DROP TABLE IF EXISTS douban_cache');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS douban_cache (
      kind TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      page_start INTEGER NOT NULL CHECK (page_start >= 0),
      page_limit INTEGER NOT NULL CHECK (page_limit > 0),
      payload_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      PRIMARY KEY (kind, category, type, page_start, page_limit)
    ) WITHOUT ROWID
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_douban_cache_expires ON douban_cache(expires_at);
  `);
}

/**
 * 获取数据库实例（单例模式）
 */
export function getDb(): SQLiteDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  ensureDataDir();

  let openingDb: SQLiteDatabase | null = null;
  try {
    openingDb = new Database(DB_PATH);

    // 启用 WAL 模式提升并发性能
    openingDb.exec('PRAGMA journal_mode = WAL');
    openingDb.exec('PRAGMA busy_timeout = 5000');

    initTables(openingDb);

    dbInstance = openingDb;
    console.log(`SQLite 数据库已连接: ${DB_PATH}`);
    return dbInstance;
  } catch (err) {
    // 若初始化中途失败，确保关闭半初始化连接，避免连接泄露
    if (openingDb) {
      try {
        openingDb.close();
      } catch (closeErr) {
        console.warn('关闭异常数据库连接失败:', closeErr);
      }
    }
    throw err;
  }
}

/**
 * 关闭数据库连接
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('SQLite 数据库连接已关闭');
  }
}
