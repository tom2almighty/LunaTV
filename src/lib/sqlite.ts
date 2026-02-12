/* eslint-disable no-console */

import path from 'path';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

// 数据库文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'sqlite.db');

// 全局数据库实例
let dbInstance: Database | null = null;

/**
 * 确保 data 目录存在
 */
async function ensureDataDir(): Promise<void> {
  const fs = await import('fs/promises');
  try {
    const stat = await fs.stat(DATA_DIR);
    if (!stat.isDirectory()) {
      throw new Error(`${DATA_DIR} 存在但不是目录`);
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log(`创建数据目录: ${DATA_DIR}`);
    } else {
      throw err;
    }
  }

  // 检查数据库文件是否被误创建为目录
  try {
    const dbStat = await fs.stat(DB_PATH);
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
async function initTables(db: Database): Promise<void> {
  // 用户表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 播放记录表
  await db.exec(`
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
  await db.exec(`
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
  await db.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      keyword TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 跳过片头片尾配置表
  await db.exec(`
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
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    )
  `);

  // 豆瓣缓存表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS douban_cache (
      cache_key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_play_records_username ON play_records(username);
    CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
    CREATE INDEX IF NOT EXISTS idx_search_history_username ON search_history(username);
    CREATE INDEX IF NOT EXISTS idx_skip_configs_username ON skip_configs(username);
    CREATE INDEX IF NOT EXISTS idx_douban_cache_expires ON douban_cache(expires_at);
  `);

  console.log('数据库表初始化完成');
}

/**
 * 获取数据库实例（单例模式）
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  await ensureDataDir();

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // 启用 WAL 模式提升并发性能
  await dbInstance.exec('PRAGMA journal_mode = WAL');
  await dbInstance.exec('PRAGMA busy_timeout = 5000');

  await initTables(dbInstance);

  console.log(`SQLite 数据库已连接: ${DB_PATH}`);

  return dbInstance;
}

/**
 * 关闭数据库连接
 */
export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    console.log('SQLite 数据库连接已关闭');
  }
}
