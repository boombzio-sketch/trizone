const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');
const db = { prepare };

// 점수 계산 함수
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
      return base * 1.5; // 브릭 보너스
    } catch { return 0; }
  }
  if (sport_type === 'swim') return distance_km * 3.0;
  if (sport_type === 'bike') return distance_km * 1.0;
  if (sport_type === 'run') return distance_km * 2.0;
  return 0;
}

// 페이스 계산
function calcPace(sport_type, distance_km, duration_sec) {
  if (!distance_km || !duration_sec) return 0;
  const minutes = duration_sec / 60;
  if (sport_type === 'swim') return (duration_sec / 60) / (distance_km * 10); // min/100m
  if (sport_type === 'bike') return (distance_km / (duration_sec / 3600)); // km/h
  if (sport_type === 'run') return minutes / distance_km; // min/km
  return 0;
}

// 기록 목록 조회 (내 것)
router.get('/', authMiddleware, (req, res) => {
  const { limit = 30, offset = 0 } = req.query;
  const rows = db.prepare(`
    SELECT w.*, u.nickname, u.avatar_color
    FROM workout_logs w
    JOIN users u ON w.user_id = u.id
    WHERE w.user_id = ?
    ORDER BY w.logged_at DESC, w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, Number(limit), Number(offset));
  res.json(rows);
});

// 모든 회원 기록 (클럽용)
router.get('/all', authMiddleware, (req, res) => {
  const { from, to } = req.query;
  let q = `SELECT w.*, u.nickname, u.avatar_color FROM workout_logs w JOIN users u ON w.user_id = u.id WHERE 1=1`;
  const params = [];
  if (from) { q += ' AND w.logged_at >= ?'; params.push(from); }
  if (to) { q += ' AND w.logged_at <= ?'; params.push(to); }
  q += ' ORDER BY w.logged_at DESC';
  res.json(db.prepare(q).all(...params));
});

// 기록 추가
router.post('/', authMiddleware, (req, res) => {
  const {
    sport_type, logged_at, distance_km, duration_sec, memo,
    pool_type, elevation_m, course_type, avg_power_w, brick_segments
  } = req.body;

  if (!sport_type || !logged_at) return res.status(400).json({ error: '종목과 날짜는 필수입니다.' });

  const pace = calcPace(sport_type, distance_km, duration_sec);
  const score = calcScore(sport_type, distance_km, brick_segments ? JSON.stringify(brick_segments) : '[]');

  const result = db.prepare(`
    INSERT INTO workout_logs
    (user_id, sport_type, logged_at, distance_km, duration_sec, memo,
     pool_type, elevation_m, course_type, avg_power_w, brick_segments, pace, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, sport_type, logged_at,
    distance_km || 0, duration_sec || 0, memo || '',
    pool_type || '', elevation_m || 0, course_type || '', avg_power_w || 0,
    brick_segments ? JSON.stringify(brick_segments) : '[]',
    pace, score
  );

  const row = db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(result.lastInsertRowid);
  res.json(row);
});

// 기록 삭제
router.delete('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  db.prepare('DELETE FROM workout_logs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 내 통계 (누적)
router.get('/stats/me', authMiddleware, (req, res) => {
  const totals = db.prepare(`
    SELECT sport_type,
           SUM(distance_km) as total_km,
           SUM(duration_sec) as total_sec,
           COUNT(*) as count
    FROM workout_logs WHERE user_id = ?
    GROUP BY sport_type
  `).all(req.user.id);

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', logged_at) as month,
           sport_type,
           SUM(distance_km) as total_km,
           COUNT(*) as count
    FROM workout_logs WHERE user_id = ?
    GROUP BY month, sport_type
    ORDER BY month DESC
    LIMIT 36
  `).all(req.user.id);

  res.json({ totals, monthly });
});

module.exports = router;
