const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');

router.use(authMiddleware, adminMiddleware);

// 전체 회원 목록
router.get('/members', (req, res) => {
  const members = prepare(`
    SELECT u.id, u.nickname, u.role, u.avatar_color, u.avatar_image, u.created_at,
           COUNT(w.id) as workout_count
    FROM users u
    LEFT JOIN workout_logs w ON w.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at ASC
  `).all();
  res.json(members);
});

// 회원 정보 수정
router.put('/members/:id', (req, res) => {
  const { nickname, avatar_color, avatar_image, password } = req.body;
  if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력하세요.' });

  const exists = prepare('SELECT id FROM users WHERE nickname=? AND id!=?').get(nickname.trim(), req.params.id);
  if (exists) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  if (password) {
    if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 10);
    prepare('UPDATE users SET nickname=?, avatar_color=?, avatar_image=?, password_hash=? WHERE id=?').run(nickname.trim(), avatar_color || '#4DB8FF', avatar_image ?? null, hash, req.params.id);
  } else {
    prepare('UPDATE users SET nickname=?, avatar_color=?, avatar_image=? WHERE id=?').run(nickname.trim(), avatar_color || '#4DB8FF', avatar_image ?? null, req.params.id);
  }

  res.json(prepare('SELECT id, nickname, role, avatar_color, avatar_image, created_at FROM users WHERE id=?').get(req.params.id));
});

// 역할 변경
router.put('/members/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role))
    return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: '자신의 역할은 변경할 수 없습니다.' });
  prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

// 회원 삭제
router.delete('/members/:id', (req, res) => {
  const uid = Number(req.params.id);
  if (uid === req.user.id)
    return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
  const user = prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });

  prepare('DELETE FROM workout_logs WHERE user_id = ?').run(uid);
  prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(uid, uid);
  prepare('DELETE FROM likes WHERE user_id = ?').run(uid);
  prepare('DELETE FROM comments WHERE user_id = ?').run(uid);
  prepare('DELETE FROM club_memberships WHERE user_id = ?').run(uid);
  prepare('DELETE FROM club_leader_applications WHERE user_id = ?').run(uid);
  prepare('DELETE FROM club_training_participants WHERE user_id = ?').run(uid);
  prepare('DELETE FROM users WHERE id = ?').run(uid);

  const check = prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (check) return res.status(500).json({ error: '삭제에 실패했습니다.' });

  res.json({ ok: true });
});

// 클럽장 신청 목록
router.get('/club-leader-apps', (req, res) => {
  const rows = prepare(`
    SELECT cla.*, u.nickname, u.avatar_color
    FROM club_leader_applications cla JOIN users u ON cla.user_id=u.id
    WHERE cla.status='pending' ORDER BY cla.applied_at ASC
  `).all();
  res.json(rows);
});

// 클럽장 신청 승인/거절
router.put('/club-leader-apps/:userId/status', (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  prepare('UPDATE club_leader_applications SET status=? WHERE user_id=?').run(status, req.params.userId);
  res.json({ ok: true });
});

// 클럽 가입 신청 목록
router.get('/memberships', (req, res) => {
  const rows = prepare(`
    SELECT cm.id, cm.user_id, cm.status, cm.message, cm.applied_at,
           u.nickname, u.avatar_color, u.created_at as user_created_at
    FROM club_memberships cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.status = 'pending'
    ORDER BY cm.applied_at ASC
  `).all();
  res.json(rows);
});

// 가입 승인/거절
router.put('/memberships/:userId/status', (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  prepare('UPDATE club_memberships SET status=? WHERE user_id=?').run(status, req.params.userId);
  res.json({ ok: true });
});

// 훈련 기록 승인 대기 목록
router.get('/pending', (req, res) => {
  const rows = prepare(`
    SELECT w.id, w.sport_type, w.logged_at, w.distance_km, w.duration_sec,
           w.memo, w.score, w.brick_segments, w.photo,
           COALESCE(w.photos, '[]') as photos,
           COALESCE(w.cover_photo_index, 0) as cover_photo_index,
           w.status, w.created_at,
           u.nickname, u.avatar_color
    FROM workout_logs w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'pending'
    ORDER BY w.created_at DESC
  `).all();
  res.json(rows);
});

// 기록 승인/반려
router.put('/workouts/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  prepare('UPDATE workout_logs SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
