const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'trizone.db');
let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      avatar_color TEXT DEFAULT '#4DB8FF',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sport_type TEXT NOT NULL,
      logged_at DATE NOT NULL,
      distance_km REAL DEFAULT 0,
      duration_sec INTEGER DEFAULT 0,
      memo TEXT DEFAULT '',
      pool_type TEXT DEFAULT '',
      elevation_m INTEGER DEFAULT 0,
      course_type TEXT DEFAULT '',
      avg_power_w INTEGER DEFAULT 0,
      brick_segments TEXT DEFAULT '[]',
      pace REAL DEFAULT 0,
      score REAL DEFAULT 0,
      status TEXT DEFAULT 'approved',
      photo TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '우리 클럽',
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    );
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workout_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const clubCheck = db.exec("SELECT id FROM club_info LIMIT 1");
  if (!clubCheck.length || !clubCheck[0].values.length) {
    db.run("INSERT INTO club_info (name, description) VALUES (?, ?)",
      ['서울철인클럽', '수영·사이클·런 통합 훈련 동호회']);
  }
  // 마이그레이션: 기존 컬럼 추가 (이미 있으면 무시)
  try { db.run("ALTER TABLE workout_logs ADD COLUMN status TEXT DEFAULT 'approved'") } catch {}
  try { db.run("ALTER TABLE workout_logs ADD COLUMN photo TEXT DEFAULT ''") } catch {}

  saveDb();
  console.log('✅ DB 초기화 완료');
}

function saveDb() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function prepare(sql) {
  return {
    get(...params) {
      const res = db.exec(sql, params);
      if (!res.length || !res[0].values.length) return undefined;
      const cols = res[0].columns;
      return Object.fromEntries(cols.map((c, i) => [c, res[0].values[0][i]]));
    },
    all(...params) {
      const res = db.exec(sql, params);
      if (!res.length) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
    },
    run(...params) {
      db.run(sql, params);
      const res = db.exec("SELECT last_insert_rowid() as id");
      const lastId = res[0]?.values[0]?.[0] || 0;
      saveDb();
      return { lastInsertRowid: lastId };
    }
  };
}

function exec(sql) { db.run(sql); saveDb(); }

module.exports = { initDb, prepare, exec, saveDb };
