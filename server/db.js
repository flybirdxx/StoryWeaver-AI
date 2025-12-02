const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const resolveDbPath = () => {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }

  const baseDir = process.env.DB_DIR
    ? path.resolve(process.env.DB_DIR)
    : path.join(__dirname, '..');

  return path.join(baseDir, 'storyweaver.db');
};

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  total_panels INTEGER DEFAULT 0,
  generated_panels INTEGER DEFAULT 0,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT DEFAULT '[]',
  base_prompt TEXT,
  image_url TEXT,
  image_is_url INTEGER DEFAULT 0,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;


