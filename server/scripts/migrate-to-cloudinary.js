// 기존 base64 이미지를 Cloudinary로 업로드하고 DB 값을 secure_url로 치환.
//
// 선행: Cloudinary 무료 계정 + Unsigned upload preset 생성 후 server/.env 에
//        CLOUDINARY_CLOUD_NAME=xxxx
//        CLOUDINARY_UPLOAD_PRESET=xxxx   (Signing Mode: Unsigned)
//
// 실행: node scripts/migrate-to-cloudinary.js          (DRY RUN)
//       node scripts/migrate-to-cloudinary.js --apply  (실제 반영)
//
// 멱등: data:image 인 값만 업로드. 이미 https URL 이면 건너뜀 → 재실행 안전.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;
if (!CLOUD || !PRESET) {
  console.error('❌ CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET 가 server/.env 에 없습니다.');
  process.exit(1);
}

const isLocal = /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: isLocal ? false : { rejectUnauthorized: false }, max: 4, connectionTimeoutMillis: 30000 });

let uploaded = 0, skipped = 0, failed = 0;
const cache = new Map();   // 동일 base64 중복 업로드 방지

async function up(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) { skipped++; return dataUrl; }
  if (cache.has(dataUrl)) return cache.get(dataUrl);
  if (!APPLY) { uploaded++; return dataUrl; }   // DRY RUN: 업로드 안 함
  const fd = new FormData();
  fd.append('file', dataUrl);                   // Cloudinary는 data URI 직접 허용
  fd.append('upload_preset', PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok || !data.secure_url) { failed++; console.warn('    ⚠ 업로드 실패:', data?.error?.message || res.status); return dataUrl; }
  uploaded++;
  cache.set(dataUrl, data.secure_url);
  return data.secure_url;
}

async function upArray(jsonStr) {
  let arr; try { arr = JSON.parse(jsonStr || '[]'); } catch { return { changed: false, json: jsonStr, arr: [] }; }
  if (!Array.isArray(arr) || !arr.length) return { changed: false, json: jsonStr, arr: [] };
  let changed = false; const next = [];
  for (const p of arr) { const np = await up(p); if (np !== p) changed = true; next.push(np); }
  return { changed, json: JSON.stringify(next), arr: next };
}

(async () => {
  console.log(APPLY ? `=== 실제 반영 → Cloudinary(${CLOUD}) ===\n` : '=== DRY RUN (업로드/반영 안 함) ===\n');

  const wl = (await pool.query('SELECT id, photo, photos, cover_photo_index FROM workout_logs')).rows;
  let wlc = 0;
  for (const r of wl) {
    const res = await upArray(r.photos);
    let newPhoto = r.photo, changed = res.changed;
    if (res.arr.length) {
      const idx = Math.min(r.cover_photo_index || 0, res.arr.length - 1);
      newPhoto = res.arr[idx] || res.arr[0] || '';
    } else if (typeof r.photo === 'string' && r.photo.startsWith('data:image')) {
      const np = await up(r.photo); if (np !== r.photo) { newPhoto = np; changed = true; }
    }
    if (changed) { wlc++; if (APPLY) await pool.query('UPDATE workout_logs SET photos=$1, photo=$2 WHERE id=$3', [res.json, newPhoto, r.id]); }
  }
  console.log(`workout_logs: ${wl.length} 스캔, ${wlc} 변경`);

  const nt = (await pool.query('SELECT id, photos FROM notices')).rows;
  let ntc = 0;
  for (const r of nt) { const res = await upArray(r.photos); if (res.changed) { ntc++; if (APPLY) await pool.query('UPDATE notices SET photos=$1 WHERE id=$2', [res.json, r.id]); } }
  console.log(`notices: ${nt.length} 스캔, ${ntc} 변경`);

  const us = (await pool.query('SELECT id, avatar_image FROM users')).rows;
  let usc = 0;
  for (const r of us) {
    if (typeof r.avatar_image === 'string' && r.avatar_image.startsWith('data:image')) {
      const np = await up(r.avatar_image); if (np !== r.avatar_image) { usc++; if (APPLY) await pool.query('UPDATE users SET avatar_image=$1 WHERE id=$2', [np, r.id]); }
    }
  }
  console.log(`users avatar: ${us.length} 스캔, ${usc} 변경`);

  console.log(`\n업로드 ${uploaded}장 / 스킵(이미 URL 등) ${skipped} / 실패 ${failed}`);
  if (!APPLY) console.log('\n※ DRY RUN. 실제 반영: node scripts/migrate-to-cloudinary.js --apply');
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
