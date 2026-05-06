const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');
const db = { prepare };

// 특정 유저 프로필 + 최근 기록
router.get('/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, nickname, role, avatar_color, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });

  const recentWorkouts = db.prepare(`
    SELECT * FROM workout_logs WHERE user_id = ?
    ORDER BY logged_at DESC LIMIT 10
  `).all(req.params.id);

  const stats = db.prepare(`
    SELECT sport_type, SUM(distance_km) as total_km, COUNT(*) as count
    FROM workout_logs WHERE user_id = ?
    GROUP BY sport_type
  `).all(req.params.id);

  res.json({ user, recentWorkouts, stats });
});

module.exports = router;
