const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');
const db = { prepare };

// 클럽 정보 조회
router.get('/info', authMiddleware, (req, res) => {
  const info = db.prepare('SELECT * FROM club_info LIMIT 1').get();
  const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  res.json({ ...info, member_count: memberCount.cnt });
});

// 클럽 정보 수정 (admin)
router.put('/info', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE club_info SET name=?, description=? WHERE id=1').run(name, description);
  res.json({ ok: true });
});

// 회원 목록
router.get('/members', authMiddleware, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.nickname, u.role, u.avatar_color, u.created_at,
           COUNT(w.id) as total_workouts,
           COALESCE(SUM(w.distance_km), 0) as total_km
    FROM users u
    LEFT JOIN workout_logs w ON u.id = w.user_id
    GROUP BY u.id
    ORDER BY u.role DESC, u.nickname
  `).all();
  res.json(members);
});

// 회원 역할 변경 (admin)
router.put('/members/:id/role', authMiddleware, adminMiddleware, (req, res) => {
  const { role } = req.body;
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: '잘못된 역할입니다.' });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ ok: true });
});

// 공지사항 목록
router.get('/announcements', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.nickname, u.avatar_color
    FROM announcements a JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC LIMIT 20
  `).all();
  res.json(rows);
});

// 공지사항 작성 (admin)
router.post('/announcements', authMiddleware, adminMiddleware, (req, res) => {
  const { title, body } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력하세요.' });
  const result = db.prepare('INSERT INTO announcements (user_id, title, body) VALUES (?,?,?)').run(req.user.id, title, body || '');
  res.json({ id: result.lastInsertRowid });
});

// 공지사항 삭제 (admin)
router.delete('/announcements/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
