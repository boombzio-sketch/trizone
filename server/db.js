const { Pool, types } = require('pg');

// Return DATE / TIMESTAMP / TIMESTAMPTZ as ISO strings (matches existing frontend
// usage patterns like `value?.slice(0, 10)`), instead of JS Date objects.
types.setTypeParser(1082, v => v);          // DATE
types.setTypeParser(1114, v => v);          // TIMESTAMP without time zone
types.setTypeParser(1184, v => v);          // TIMESTAMPTZ
// BIGINT (INT8) → Number — IDs aren't going to overflow JS safe int range here.
types.setTypeParser(20, v => v === null ? null : parseInt(v, 10));
// NUMERIC (1700) → Number — SUM(distance_km) etc. land here when REAL is summed.
types.setTypeParser(1700, v => v === null ? null : parseFloat(v));

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다. .env 또는 호스팅 환경변수에 Neon connection string을 넣어주세요.');
  process.exit(1);
}

const isLocal = /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err.message);
});

// Translate the small subset of SQLite-flavored SQL the codebase uses into Postgres.
//   1. `?` positional placeholders → `$1, $2, …`
//   2. `strftime('%Y-%m', col)` → `to_char(col, 'YYYY-MM')`
function translate(sql) {
  let i = 0;
  let out = sql.replace(/\?/g, () => `$${++i}`);
  out = out.replace(/strftime\s*\(\s*'%Y-%m'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')");
  return out;
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      avatar_color TEXT DEFAULT '#4DB8FF',
      avatar_image TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS workout_logs (
      id SERIAL PRIMARY KEY,
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
      photos TEXT DEFAULT '[]',
      cover_photo_index INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'public',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_info (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '우리 클럽',
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS clubs (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      region TEXT DEFAULT '',
      leader_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_memberships (
      id SERIAL PRIMARY KEY,
      club_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT DEFAULT '',
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(club_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS club_leader_applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_announcements (
      id SERIAL PRIMARY KEY,
      club_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS follows (
      id SERIAL PRIMARY KEY,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    );
    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      workout_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workout_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      workout_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS races (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      date DATE NOT NULL,
      location TEXT NOT NULL,
      distance TEXT NOT NULL,
      entry_fee INTEGER DEFAULT 0,
      reg_url TEXT DEFAULT '',
      capacity INTEGER DEFAULT 0,
      reg_start DATE,
      reg_end DATE,
      created_by INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_trainings (
      id SERIAL PRIMARY KEY,
      club_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      train_date DATE NOT NULL,
      train_time TEXT DEFAULT '',
      location TEXT NOT NULL,
      description TEXT DEFAULT '',
      capacity INTEGER DEFAULT 0,
      link_url TEXT DEFAULT '',
      created_by INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS club_training_participants (
      id SERIAL PRIMARY KEY,
      training_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'joined',
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(training_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      photos TEXT DEFAULT '[]',
      pinned BOOLEAN DEFAULT false,
      created_by INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default club_info row
  const clubCheck = await pool.query('SELECT id FROM club_info LIMIT 1');
  if (clubCheck.rowCount === 0) {
    await pool.query(
      'INSERT INTO club_info (name, description) VALUES ($1, $2)',
      ['KTA CREW', '코리아 트라이애슬론 아카데미 크루']
    );
  }


  // Add can_approve column if not exists
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_approve BOOLEAN DEFAULT FALSE`);
  // Add email column if not exists (UNIQUE only for non-NULL values)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL`);
  // Add password reset columns
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ DEFAULT NULL`);

  // Add club_role column to club_memberships (member | sub_leader)
  await pool.query(`ALTER TABLE club_memberships ADD COLUMN IF NOT EXISTS club_role TEXT DEFAULT 'member'`);

  // Add photos column to notices
  await pool.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS photos TEXT DEFAULT '[]'`);

  // Admins → auto-approved leader application
  await pool.query(`
    INSERT INTO club_leader_applications (user_id, status)
    SELECT id, 'approved' FROM users WHERE role='admin'
    ON CONFLICT (user_id) DO NOTHING
  `);

  // Club leaders → membership in their own clubs
  await pool.query(`
    INSERT INTO club_memberships (club_id, user_id, status)
    SELECT id, leader_id, 'approved' FROM clubs WHERE leader_id IS NOT NULL
    ON CONFLICT (club_id, user_id) DO NOTHING
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
  console.log(`✅ Postgres DB 초기화 완료 — 현재 회원 수: ${rows[0].cnt}명`);
}

// Tiny wrapper that mimics the old better-sqlite3 / sql.js API surface
// (`prepare(sql).get/all/run`) but resolves to Postgres. Callers must `await`.
function prepare(rawSql) {
  const wasOrIgnore = /^\s*INSERT\s+OR\s+IGNORE\s+/i.test(rawSql);
  const cleaned = rawSql.replace(/^\s*INSERT\s+OR\s+IGNORE\s+/i, 'INSERT ');
  const sql = translate(cleaned);
  const isInsert = /^\s*INSERT\b/i.test(sql);

  return {
    async get(...params) {
      const { rows } = await pool.query(sql, params);
      return rows[0];
    },
    async all(...params) {
      const { rows } = await pool.query(sql, params);
      return rows;
    },
    async run(...params) {
      let finalSql = sql;
      if (isInsert) {
        if (wasOrIgnore && !/\bON\s+CONFLICT\b/i.test(finalSql)) {
          finalSql += ' ON CONFLICT DO NOTHING';
        }
        if (!/\bRETURNING\b/i.test(finalSql)) {
          finalSql += ' RETURNING id';
        }
      }
      const result = await pool.query(finalSql, params);
      return {
        lastInsertRowid: result.rows[0]?.id || 0,
        changes: result.rowCount,
      };
    },
  };
}

async function exec(sql) {
  await pool.query(sql);
}

module.exports = { initDb, prepare, exec, pool };
