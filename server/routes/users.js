const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');
const db = { prepare };

// 내 프로필 수정
router.put('/me', authMiddleware, async (req, res) => {
  const { password, avatar_color, avatar_image } = req.body;
  const uid = req.user.id;

  if (password !== undefined && password !== '') {
    if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    const hash = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE users SET password_hash=?, avatar_color=?, avatar_image=? WHERE id=?')
      .run(hash, avatar_color || '#4DB8FF', avatar_image ?? null, uid);
  } else {
    await db.prepare('UPDATE users SET avatar_color=?, avatar_image=? WHERE id=?')
      .run(avatar_color || '#4DB8FF', avatar_image ?? null, uid);
  }

  const updated = await db.prepare('SELECT id, nickname, role, avatar_color, avatar_image FROM users WHERE id=?').get(uid);
  res.json(updated);
});

// 특정 유저 프로필 + 최근 기록
router.get('/:id', authMiddleware, async (req, res) => {
  const uid = Number(req.params.id);
  const user = await db.prepare('SELECT id, nickname, role, avatar_color, created_at FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });

  const isSelf = req.user.id === uid;
  const recentWorkouts = await db.prepare(`
    SELECT * FROM workout_logs WHERE user_id = ? AND status = 'approved'
    ${isSelf ? '' : "AND visibility NOT IN ('private')"}
    ORDER BY logged_at DESC LIMIT 10
  `).all(uid);

  const stats = await db.prepare(`
    SELECT sport_type, SUM(distance_km) as total_km, COUNT(*) as count
    FROM workout_logs WHERE user_id = ?
    GROUP BY sport_type
  `).all(uid);

  res.json({ user, recentWorkouts, stats });
});

module.exports = router;
