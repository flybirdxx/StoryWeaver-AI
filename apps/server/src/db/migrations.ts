// 数据库迁移脚本：创建所有必需的表（projects, characters, jobs）

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// 获取数据库实例（与 client.ts 相同的逻辑）
const resolveDbPath = (): string => {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }

  const baseDir = process.env.DB_DIR
    ? path.resolve(process.env.DB_DIR)
    : path.join(__dirname, '..', '..', '..');

  return path.join(baseDir, 'storyweaver.db');
};

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

/**
 * 创建 projects 表（如果不存在）
 */
export async function createProjectsTable(): Promise<void> {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        total_panels INTEGER NOT NULL DEFAULT 0,
        generated_panels INTEGER NOT NULL DEFAULT 0,
        data TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('[Migration] projects 表创建成功');
  } catch (error) {
    console.error('[Migration] 创建 projects 表失败:', error);
    throw error;
  }
}

/**
 * 创建 characters 表（如果不存在）
 */
export async function createCharactersTable(): Promise<void> {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        base_prompt TEXT,
        image_url TEXT,
        image_is_url INTEGER NOT NULL DEFAULT 0,
        data TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('[Migration] characters 表创建成功');
  } catch (error) {
    console.error('[Migration] 创建 characters 表失败:', error);
    throw error;
  }
}

/**
 * 创建 jobs 表（如果不存在）
 */
export async function createJobsTable(): Promise<void> {
  try {
    // 创建 jobs 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'image_generation',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        priority INTEGER NOT NULL DEFAULT 0,
        payload TEXT NOT NULL,
        result TEXT,
        error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      )
    `);

    // 创建索引以提高查询性能
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)
    `);
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON jobs(status, priority DESC, created_at ASC)
    `);

    console.log('[Migration] jobs 表创建成功');
  } catch (error) {
    console.error('[Migration] 创建 jobs 表失败:', error);
    throw error;
  }
}

/**
 * 运行所有迁移
 */
export async function runMigrations(): Promise<void> {
  console.log('[Migration] 开始运行数据库迁移...');
  
  // 按顺序创建表（projects 和 characters 是基础表，jobs 依赖它们）
  await createProjectsTable();
  await createCharactersTable();
  await createJobsTable();
  
  console.log('[Migration] 数据库迁移完成');
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migration] 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

