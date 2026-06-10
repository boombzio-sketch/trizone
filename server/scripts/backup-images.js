// 마이그레이션 전 원본 이미지 컬럼 백업 (복구용).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const isLocal = /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: isLocal ? false : { rejectUnauthorized: false }, max: 4, connectionTimeoutMillis: 30000 });

(async () => {
  const out = {
    ts: new Date().toISOString(),
    workout_logs: (await pool.query('SELECT id, photo, photos, cover_photo_index FROM workout_logs')).rows,
    notices: (await pool.query('SELECT id, photos FROM notices')).rows,
    users: (await pool.query('SELECT id, avatar_image FROM users')).rows,
  };
  const file = path.join(__dirname, 'images-backup.json');
  fs.writeFileSync(file, JSON.stringify(out));
  const mb = (fs.statSync(file).size / 1048576).toFixed(2);
  console.log(`백업 완료: ${file} (${mb}MB, workout ${out.workout_logs.length} / notices ${out.notices.length} / users ${out.users.length})`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
