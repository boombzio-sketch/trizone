const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');

router.use(authMiddleware, adminMiddleware);

// 전체 회원 목록
router.get('/members', (req, res) => {
  const members = prepare(`
    SELECT u.id, u.nickname, u.role, u.avatar_color, u.created_at,
           COUNT(w.id) as workout_count
    FROM users u
    LEFT JOIN workout_logs w ON w.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at ASC
  `).all();
  res.json(members);
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
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
  prepare('DELETE FROM workout_logs WHERE user_id = ?').run(req.params.id);
  prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(req.params.id, req.params.id);
  prepare('DELETE FROM likes WHERE user_id = ?').run(req.params.id);
  prepare('DELETE FROM comments WHERE user_id = ?').run(req.params.id);
  prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 승인 대기 기록 목록
router.get('/pending', (req, res) => {
  const rows = prepare(`
    SELECT w.id, w.sport_type, w.logged_at, w.distance_km, w.duration_sec,
           w.memo, w.score, w.brick_segments, w.photo, w.status, w.created_at,
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
