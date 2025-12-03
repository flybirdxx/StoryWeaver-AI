import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

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

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;


