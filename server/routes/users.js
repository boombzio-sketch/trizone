const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');
const db = { prepare };

// 내 프로필 수정
router.put('/me', authMiddleware, async (req, res) => {
  const { password, avatar_color, avatar_image, nickname, email } = req.body;
  const uid = req.user.id;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (nickname !== undefined) {
    if (!nickname.trim() || nickname.trim().length < 2)
      return res.status(400).json({ error: '닉네임은 2자 이상이어야 합니다.' });
    const dup = await db.prepare('SELECT id FROM users WHERE nickname=? AND id!=?').get(nickname.trim(), uid);
    if (dup) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
  }

  const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;
  if (normalizedEmail) {
    if (!EMAIL_RE.test(normalizedEmail))
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
    const dup = await db.prepare('SELECT id FROM users WHERE email=? AND id!=?').get(normalizedEmail, uid);
    if (dup) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
  }

  const current = await db.prepare('SELECT nickname, email FROM users WHERE id=?').get(uid);
  const newNick  = nickname?.trim() || current.nickname;
  const newEmail = normalizedEmail ?? current.email;

  if (password !== undefined && password !== '') {
    if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    const hash = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE users SET nickname=?, email=?, password_hash=?, avatar_color=?, avatar_image=? WHERE id=?')
      .run(newNick, newEmail, hash, avatar_color || '#4DB8FF', avatar_image ?? null, uid);
  } else {
    await db.prepare('UPDATE users SET nickname=?, email=?, avatar_color=?, avatar_image=? WHERE id=?')
      .run(newNick, newEmail, avatar_color || '#4DB8FF', avatar_image ?? null, uid);
  }

  const updated = await db.prepare('SELECT id, nickname, email, role, avatar_color, avatar_image, can_approve FROM users WHERE id=?').get(uid);
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
    ${isSelf ? '' : "AND visibility = 'public'"}
    ORDER BY logged_at DESC LIMIT 10
  `).all(uid);

  const stats = await db.prepare(`
    SELECT sport_type, SUM(distance_km) as total_km, COUNT(*) as count
    FROM workout_logs WHERE user_id = ? AND status = 'approved'
    GROUP BY sport_type
  `).all(uid);

  res.json({ user, recentWorkouts, stats });
});

module.exports = router;
