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
    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      region TEXT DEFAULT '',
      leader_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_leader_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
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
    CREATE TABLE IF NOT EXISTS races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date DATE NOT NULL,
      location TEXT NOT NULL,
      distance TEXT NOT NULL,
      entry_fee INTEGER DEFAULT 0,
      reg_url TEXT DEFAULT '',
      capacity INTEGER DEFAULT 0,
      reg_start DATE DEFAULT '',
      reg_end DATE DEFAULT '',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // club_info 초기 데이터
  const clubCheck = db.exec("SELECT id FROM club_info LIMIT 1");
  if (!clubCheck.length || !clubCheck[0].values.length) {
    db.run("INSERT INTO club_info (name, description) VALUES (?, ?)",
      ['KTA CREW', '코리아 트라이애슬론 아카데미 크루']);
  }

  // ── 마이그레이션 ──────────────────────────────────────────

  // 1. workout_logs 컬럼
  try { db.run("ALTER TABLE workout_logs ADD COLUMN status TEXT DEFAULT 'approved'") } catch {}
  try { db.run("ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL") } catch {}
  try { db.run("ALTER TABLE workout_logs ADD COLUMN photo TEXT DEFAULT ''") } catch {}
  try { db.run("ALTER TABLE workout_logs ADD COLUMN visibility TEXT DEFAULT 'public'") } catch {}
  try { db.run("ALTER TABLE workout_logs ADD COLUMN photos TEXT DEFAULT '[]'") } catch {}
  try { db.run("ALTER TABLE workout_logs ADD COLUMN cover_photo_index INTEGER DEFAULT 0") } catch {}

  // 훈련 모집 테이블
  try {
    db.run(`CREATE TABLE IF NOT EXISTS club_trainings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      train_date DATE NOT NULL,
      train_time TEXT DEFAULT '',
      location TEXT NOT NULL,
      description TEXT DEFAULT '',
      capacity INTEGER DEFAULT 0,
      link_url TEXT DEFAULT '',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
    db.run(`CREATE TABLE IF NOT EXISTS club_training_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      training_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'joined',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(training_id, user_id)
    )`)
  } catch {}

  // 2. club_memberships 재구성 (club_id + 복합 UNIQUE)
  try {
    const cols = db.exec("PRAGMA table_info(club_memberships)");
    const hasClubId = cols.length > 0 && cols[0].values.some(r => r[1] === 'club_id');
    if (!hasClubId) {
      db.run(`CREATE TABLE IF NOT EXISTS club_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        club_id INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        message TEXT DEFAULT '',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, user_id)
      )`);
    }
  } catch {}

  // 기존 단일 club_memberships 테이블이 user_id UNIQUE인 경우 재생성
  try {
    const idx = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='club_memberships'");
    if (idx.length && idx[0].values[0][0] && !idx[0].values[0][0].includes('club_id')) {
      db.run(`CREATE TABLE club_memberships_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        club_id INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        message TEXT DEFAULT '',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, user_id)
      )`);
      db.run("INSERT OR IGNORE INTO club_memberships_new (id, club_id, user_id, status, message, applied_at) SELECT id, 1, user_id, status, message, applied_at FROM club_memberships");
      db.run("DROP TABLE club_memberships");
      db.run("ALTER TABLE club_memberships_new RENAME TO club_memberships");
    }
  } catch {}

  // 3. clubs 테이블에 기존 club_info 마이그레이션
  try {
    const cnt = db.exec("SELECT COUNT(*) FROM clubs");
    if (cnt[0].values[0][0] === 0) {
      const old = db.exec("SELECT name, description FROM club_info LIMIT 1");
      if (old.length && old[0].values.length) {
        const [name, desc] = old[0].values[0];
        const adminU = db.exec("SELECT id FROM users WHERE role='admin' LIMIT 1");
        const leaderId = adminU[0]?.values[0]?.[0] || null;
        db.run("INSERT INTO clubs (id, name, description, region, leader_id) VALUES (1, ?, ?, '', ?)", [name, desc, leaderId]);
      }
    }
  } catch {}

  // 4. club_announcements에 기존 announcements 마이그레이션
  try {
    const cnt = db.exec("SELECT COUNT(*) FROM club_announcements");
    if (cnt[0].values[0][0] === 0) {
      db.run("INSERT INTO club_announcements (club_id, user_id, title, body, created_at) SELECT 1, user_id, title, body, created_at FROM announcements");
    }
  } catch {}

  // 5. 기존 유저 club_id=1에 승인 처리
  db.run("INSERT OR IGNORE INTO club_memberships (club_id, user_id, status) SELECT 1, id, 'approved' FROM users");

  // 6. admin 유저 클럽장 신청 자동 승인
  db.run("INSERT OR IGNORE INTO club_leader_applications (user_id, status) SELECT id, 'approved' FROM users WHERE role='admin'");

  // 7. 클럽장을 클럽 멤버십에 추가 (누락된 경우)
  db.run("INSERT OR IGNORE INTO club_memberships (club_id, user_id, status) SELECT id, leader_id, 'approved' FROM clubs WHERE leader_id IS NOT NULL");

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
