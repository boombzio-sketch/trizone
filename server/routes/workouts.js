const router = require('express').Router();
const { prepare } = require('../db');
const { accrueForWorkout, handleWorkoutDeletion } = require('../points');
const { authMiddleware, adminMiddleware } = require('../middleware');
const adminOnly = [authMiddleware, adminMiddleware];
const db = { prepare };

function calcScore(sport_type, distance_km, brick_segments) {
  if (sport_type === 'brick') {
    try {
      const segs = JSON.parse(brick_segments || '[]');
      let base = 0;
      for (const s of segs) {
        if (s.sport === 'swim') base += (s.distance_km || 0) * 3.0;
        else if (s.sport === 'bike') base += (s.distance_km || 0) * 1.0;
        else if (s.sport === 'run') base += (s.distance_km || 0) * 2.0;
      }
      return base * 1.5;
    } catch { return 0; }
  }
  if (sport_type === 'swim') return distance_km * 3.0;
  if (sport_type === 'bike') return distance_km * 1.0;
  if (sport_type === 'run') return distance_km * 2.0;
  return 0;
}

function calcPace(sport_type, distance_km, duration_sec) {
  if (!distance_km || !duration_sec) return 0;
  const minutes = duration_sec / 60;
  if (sport_type === 'swim') return (duration_sec / 60) / (distance_km * 10);
  if (sport_type === 'bike') return (distance_km / (duration_sec / 3600));
  if (sport_type === 'run') return minutes / distance_km;
  return 0;
}

// 기록 목록 (내 것)
router.get('/', authMiddleware, async (req, res) => {
  const { limit = 30, offset = 0 } = req.query;
  const rows = await db.prepare(`
    SELECT w.*, u.nickname, u.avatar_color,
      (SELECT COALESCE(SUM(amount),0) FROM point_transactions WHERE workout_id=w.id AND type='auto') as points_earned
    FROM workout_logs w
    JOIN users u ON w.user_id = u.id
    WHERE w.user_id = ?
    ORDER BY w.logged_at DESC, w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, Number(limit), Number(offset));
  res.json(rows);
});

// 모든 회원 기록 (관리자 전용)
router.get('/all', ...adminOnly, async (req, res) => {
  const { from, to } = req.query;
  let q = `SELECT w.*, u.nickname, u.avatar_color FROM workout_logs w JOIN users u ON w.user_id = u.id WHERE 1=1`;
  const params = [];
  if (from) { q += ' AND w.logged_at >= ?'; params.push(from); }
  if (to) { q += ' AND w.logged_at <= ?'; params.push(to); }
  q += ' ORDER BY w.logged_at DESC';
  res.json(await db.prepare(q).all(...params));
});

// 기록 수정
router.put('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { memo, visibility, logged_at, distance_km, duration_sec,
          pool_type, elevation_m, course_type, avg_power_w, brick_segments,
          photos, cover_photo_index } = req.body;

  const row = await db.prepare('SELECT * FROM workout_logs WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin' && !req.user.can_approve)
    return res.status(403).json({ error: '수정 권한이 없습니다.' });

  const validVis = ['public','club','followers','private','club_followers'];
  if (visibility && !validVis.includes(visibility)) return res.status(400).json({ error: '유효하지 않은 공개 범위입니다.' });

  const newDist  = distance_km  !== undefined ? Number(distance_km)  : row.distance_km;
  const newDur   = duration_sec !== undefined ? Number(duration_sec) : row.duration_sec;
  const newBrick = brick_segments ? JSON.stringify(brick_segments)   : row.brick_segments;

  let newPhotos = row.photos;
  let newCoverIdx = row.cover_photo_index;
  let newPhoto = row.photo;
  if (photos !== undefined) {
    newPhotos = JSON.stringify(photos);
    newCoverIdx = cover_photo_index !== undefined ? Number(cover_photo_index) : 0;
    newPhoto = photos[newCoverIdx] || '';
  }

  const pace  = calcPace(row.sport_type, newDist, newDur);
  const score = calcScore(row.sport_type, newDist, newBrick);

  await db.prepare(`
    UPDATE workout_logs
    SET memo=?, visibility=?, logged_at=?, distance_km=?, duration_sec=?,
        pool_type=?, elevation_m=?, course_type=?, avg_power_w=?,
        brick_segments=?, pace=?, score=?, photos=?, cover_photo_index=?, photo=?
    WHERE id=?
  `).run(
    memo      ?? row.memo,
    visibility || row.visibility,
    logged_at  || row.logged_at,
    newDist, newDur,
    pool_type    !== undefined ? pool_type    : row.pool_type,
    elevation_m  !== undefined ? elevation_m  : row.elevation_m,
    course_type  !== undefined ? course_type  : row.course_type,
    avg_power_w  !== undefined ? avg_power_w  : row.avg_power_w,
    newBrick, pace, score, newPhotos, newCoverIdx, newPhoto, id
  );
  res.json(await db.prepare('SELECT * FROM workout_logs WHERE id=?').get(id));
});

// 기록 추가
router.post('/', authMiddleware, async (req, res) => {
  const {
    sport_type, logged_at, distance_km, duration_sec, memo,
    pool_type, elevation_m, course_type, avg_power_w, brick_segments,
    photo, photos, cover_photo_index, visibility
  } = req.body;

  if (!sport_type || !logged_at) return res.status(400).json({ error: '종목과 날짜는 필수입니다.' });

  const pace  = calcPace(sport_type, distance_km, duration_sec);
  const score = calcScore(sport_type, distance_km, brick_segments ? JSON.stringify(brick_segments) : '[]');

  const result = await db.prepare(`
    INSERT INTO workout_logs
    (user_id, sport_type, logged_at, distance_km, duration_sec, memo,
     pool_type, elevation_m, course_type, avg_power_w, brick_segments, pace, score,
     status, photo, photos, cover_photo_index, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)
  `).run(
    req.user.id, sport_type, logged_at,
    distance_km || 0, duration_sec || 0, memo || '',
    pool_type || '', elevation_m || 0, course_type || '', avg_power_w || 0,
    brick_segments ? JSON.stringify(brick_segments) : '[]',
    pace, score,
    photos?.[cover_photo_index || 0] || photo || '',
    photos ? JSON.stringify(photos) : '[]',
    cover_photo_index || 0,
    visibility || 'public'
  );

  const row = await db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(result.lastInsertRowid);

  // 포인트 자동 적립 — 실패해도 기록 저장은 성공 처리.
  let pointsEarned = 0;
  try {
    pointsEarned = await accrueForWorkout({
      userId: req.user.id, sportType: sport_type, loggedAt: logged_at, workoutId: row.id,
    });
  } catch (e) {
    console.error('[points] 자동 적립 실패:', e.message);
  }

  res.json({ ...row, points_earned: pointsEarned });
});

// 기록 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  await db.prepare('DELETE FROM workout_logs WHERE id = ?').run(id);

  // 자동 적립 포인트 처리: 같은 날·종목의 다른 기록이 남아 있으면 그 기록으로 이전,
  // 없으면 회수. (실패가 삭제를 막지 않도록 격리.)
  try {
    await handleWorkoutDeletion({
      workoutId: id, userId: row.user_id, sportType: row.sport_type, loggedAt: row.logged_at,
    });
  } catch (e) { console.error('[points] 삭제 후 포인트 처리 실패:', e.message); }

  res.json({ ok: true });
});

// 내 통계
router.get('/stats/me', authMiddleware, async (req, res) => {
  const totals = await db.prepare(`
    SELECT sport_type, SUM(distance_km) as total_km, SUM(duration_sec) as total_sec, COUNT(*) as count
    FROM workout_logs WHERE user_id = ?
    GROUP BY sport_type
  `).all(req.user.id);

  const monthly = await db.prepare(`
    SELECT strftime('%Y-%m', logged_at) as month, sport_type,
           SUM(distance_km) as total_km, COUNT(*) as count
    FROM workout_logs WHERE user_id = ?
    GROUP BY month, sport_type ORDER BY month DESC LIMIT 36
  `).all(req.user.id);

  res.json({ totals, monthly });
});

module.exports = router;
