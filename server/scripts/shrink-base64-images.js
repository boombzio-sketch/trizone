// 기존 base64 이미지를 더 작은 base64로 재압축 (화질보다 용량 우선).
//
// 대상: workout_logs(photos[], photo 커버), notices(photos[]), users(avatar_image)
// - data:image base64 만 처리. Cloudinary/외부 URL 은 건드리지 않음.
// - 멱등성: 이미 충분히 작은(아래 MIN_SKIP 미만) 이미지는 건너뜀 → 재실행해도 재열화 없음.
// - 재압축 결과가 원본보다 크면 원본 유지.
//
// 실행: node scripts/shrink-base64-images.js          (DRY RUN, 변경 미반영)
//       node scripts/shrink-base64-images.js --apply  (실제 DB 반영)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sharp = require('sharp');
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const isLocal = /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 4,
  connectionTimeoutMillis: 30000,
});

const PHOTO = { maxW: 860, quality: 45, minSkip: 35000 };    // 훈련/공지 사진
const AVATAR = { maxW: 256, quality: 60, minSkip: 9000 };    // 프로필 아바타

function b64Bytes(s) {
  if (typeof s !== 'string' || !s.startsWith('data:image')) return 0;
  const i = s.indexOf(',');
  return Math.floor((i >= 0 ? s.slice(i + 1) : s).length * 0.75);
}
const mb = n => (n / 1048576).toFixed(2) + 'MB';
const kb = n => (n / 1024).toFixed(0) + 'KB';

// 단일 base64 → 재압축 base64. base64 아니면(또는 충분히 작으면) 그대로 반환.
async function shrink(dataUrl, opt) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return dataUrl;
  const before = b64Bytes(dataUrl);
  if (before < opt.minSkip) return dataUrl;                 // 이미 작음 → 스킵(멱등)
  const i = dataUrl.indexOf(',');
  const buf = Buffer.from(dataUrl.slice(i + 1), 'base64');
  let out;
  try {
    out = await sharp(buf).rotate()                         // EXIF 회전 반영
      .resize({ width: opt.maxW, withoutEnlargement: true })
      .jpeg({ quality: opt.quality, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    console.warn(`    ⚠ 디코드 실패 → 원본 유지: ${e.message}`);
    return dataUrl;
  }
  if (out.length >= buf.length) return dataUrl;             // 더 커지면 원본 유지
  return 'data:image/jpeg;base64,' + out.toString('base64');
}

const stat = { before: 0, after: 0, imgs: 0, shrunk: 0, rows: 0 };

async function shrinkArray(jsonStr, opt) {
  let arr;
  try { arr = JSON.parse(jsonStr || '[]'); } catch { return { changed: false, json: jsonStr }; }
  if (!Array.isArray(arr) || arr.length === 0) return { changed: false, json: jsonStr };
  let changed = false;
  const next = [];
  for (const p of arr) {
    const isB64 = typeof p === 'string' && p.startsWith('data:image');
    if (isB64) { stat.imgs++; stat.before += b64Bytes(p); }
    const np = await shrink(p, opt);
    if (np !== p) { changed = true; stat.shrunk++; }
    if (isB64) stat.after += b64Bytes(np);
    next.push(np);
  }
  return { changed, json: JSON.stringify(next), arr: next };
}

(async () => {
  console.log(APPLY ? '=== 실제 반영 (--apply) ===\n' : '=== DRY RUN (미반영) — 실제 반영하려면 --apply ===\n');

  // 1) workout_logs
  const wl = (await pool.query('SELECT id, photo, photos, cover_photo_index FROM workout_logs')).rows;
  for (const r of wl) {
    const res = await shrinkArray(r.photos, PHOTO);
    let newPhoto = r.photo;
    let changed = res.changed;

    if (res.arr && res.arr.length > 0) {
      // 커버는 배열에서 다시 가져옴 (배열을 줄였으므로)
      const idx = Math.min(r.cover_photo_index || 0, res.arr.length - 1);
      newPhoto = res.arr[idx] || res.arr[0] || '';
    } else {
      // 배열이 비어있고 단일 커버만 base64인 레거시
      if (typeof r.photo === 'string' && r.photo.startsWith('data:image')) {
        stat.imgs++; stat.before += b64Bytes(r.photo);
        const np = await shrink(r.photo, PHOTO);
        stat.after += b64Bytes(np);
        if (np !== r.photo) { newPhoto = np; changed = true; stat.shrunk++; }
      }
    }
    if (changed) {
      stat.rows++;
      if (APPLY) await pool.query('UPDATE workout_logs SET photos=$1, photo=$2 WHERE id=$3', [res.json, newPhoto, r.id]);
    }
  }
  console.log(`workout_logs: ${wl.length}개 스캔, ${stat.rows}개 변경`);

  // 2) notices
  let ntRows = 0;
  const nt = (await pool.query('SELECT id, photos FROM notices')).rows;
  for (const r of nt) {
    const res = await shrinkArray(r.photos, PHOTO);
    if (res.changed) { ntRows++; if (APPLY) await pool.query('UPDATE notices SET photos=$1 WHERE id=$2', [res.json, r.id]); }
  }
  console.log(`notices: ${nt.length}개 스캔, ${ntRows}개 변경`);

  // 3) users avatar
  let usRows = 0;
  const us = (await pool.query('SELECT id, avatar_image FROM users')).rows;
  for (const r of us) {
    if (typeof r.avatar_image === 'string' && r.avatar_image.startsWith('data:image')) {
      stat.imgs++; stat.before += b64Bytes(r.avatar_image);
      const np = await shrink(r.avatar_image, AVATAR);
      stat.after += b64Bytes(np);
      if (np !== r.avatar_image) { usRows++; stat.shrunk++; if (APPLY) await pool.query('UPDATE users SET avatar_image=$1 WHERE id=$2', [np, r.id]); }
    }
  }
  console.log(`users avatar: ${us.length}명 스캔, ${usRows}명 변경`);

  console.log(`\n이미지 ${stat.imgs}장 중 ${stat.shrunk}장 압축`);
  console.log(`용량: ${mb(stat.before)} → ${mb(stat.after)}  (${stat.before > 0 ? (100 - stat.after / stat.before * 100).toFixed(0) : 0}% 감소, 평균 ${stat.imgs ? kb(stat.after / stat.imgs) : 0}/장)`);
  if (!APPLY) console.log('\n※ DRY RUN 이었습니다. 실제 반영: node scripts/shrink-base64-images.js --apply');
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
