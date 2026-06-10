// 읽기 전용: base64 이미지가 DB에 얼마나 있는지 규모 분석.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const isLocal = /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 4,
  connectionTimeoutMillis: 30000,
});

function b64Bytes(s) {
  if (typeof s !== 'string' || !s.startsWith('data:image')) return 0;
  const i = s.indexOf(',');
  const body = i >= 0 ? s.slice(i + 1) : s;
  return Math.floor(body.length * 0.75);
}
function arrBytes(jsonStr) {
  let arr = [];
  try { arr = JSON.parse(jsonStr || '[]'); } catch {}
  if (!Array.isArray(arr)) return { count: 0, bytes: 0 };
  let bytes = 0, count = 0;
  for (const p of arr) { const b = b64Bytes(p); if (b > 0) { bytes += b; count++; } }
  return { count, bytes };
}
const mb = n => (n / 1048576).toFixed(2) + 'MB';

(async () => {
  let total = 0, b64imgs = 0;

  const wl = await pool.query('SELECT id, photo, photos FROM workout_logs');
  let wlBytes = 0, wlRows = 0, wlImgs = 0;
  for (const r of wl.rows) {
    const a = arrBytes(r.photos);
    const coverInArr = (() => { try { return JSON.parse(r.photos||'[]').includes(r.photo); } catch { return false; } })();
    const coverBytes = coverInArr ? 0 : b64Bytes(r.photo); // 커버가 배열에 또 있으면 중복 카운트 방지
    const rowBytes = a.bytes + coverBytes;
    if (rowBytes > 0) { wlRows++; wlBytes += rowBytes; wlImgs += a.count + (coverBytes>0?1:0); }
  }
  console.log(`workout_logs: ${wlRows}개 기록 / ${wlImgs}장 / ${mb(wlBytes)}`);
  total += wlBytes; b64imgs += wlImgs;

  const nt = await pool.query('SELECT id, photos FROM notices');
  let ntBytes = 0, ntRows = 0, ntImgs = 0;
  for (const r of nt.rows) {
    const a = arrBytes(r.photos);
    if (a.bytes > 0) { ntRows++; ntBytes += a.bytes; ntImgs += a.count; }
  }
  console.log(`notices: ${ntRows}개 공지 / ${ntImgs}장 / ${mb(ntBytes)}`);
  total += ntBytes; b64imgs += ntImgs;

  const us = await pool.query('SELECT id, avatar_image FROM users');
  let usBytes = 0, usRows = 0;
  for (const r of us.rows) {
    const b = b64Bytes(r.avatar_image);
    if (b > 0) { usRows++; usBytes += b; }
  }
  console.log(`users avatar: ${usRows}명 / ${mb(usBytes)}`);
  total += usBytes; b64imgs += usRows;

  console.log(`\n총 base64 이미지: ${b64imgs}장 / ${mb(total)}`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
