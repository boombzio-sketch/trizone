const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');
const db = { prepare };

// 클럽 정보
router.get('/info', authMiddleware, (req, res) => {
  const info = db.prepare('SELECT * FROM club_info LIMIT 1').get();
  const memberCount = db.prepare("SELECT COUNT(*) as cnt FROM club_memberships WHERE status='approved'").get();
  res.json({ ...info, member_count: memberCount.cnt });
});

// 클럽 정보 수정 (admin)
router.put('/info', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE club_info SET name=?, description=? WHERE id=1').run(name, description);
  res.json({ ok: true });
});

// 내 가입 상태
router.get('/membership', authMiddleware, (req, res) => {
  const m = db.prepare('SELECT * FROM club_memberships WHERE user_id=?').get(req.user.id);
  res.json(m || { status: null });
});

// 가입 신청
router.post('/join', authMiddleware, (req, res) => {
  const { message } = req.body;
  const existing = db.prepare('SELECT * FROM club_memberships WHERE user_id=?').get(req.user.id);
  if (existing?.status === 'approved') return res.status(400).json({ error: '이미 클럽 회원입니다.' });
  if (existing?.status === 'pending') return res.status(400).json({ error: '이미 가입 신청 중입니다.' });

  if (existing) {
    db.prepare("UPDATE club_memberships SET status='pending', message=?, applied_at=CURRENT_TIMESTAMP WHERE user_id=?")
      .run(message || '', req.user.id);
  } else {
    db.prepare("INSERT INTO club_memberships (user_id, status, message) VALUES (?, 'pending', ?)")
      .run(req.user.id, message || '');
  }
  res.json({ ok: true });
});

// 클럽 탈퇴
router.delete('/leave', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') return res.status(400).json({ error: '클럽장은 탈퇴할 수 없습니다.' });
  db.prepare("UPDATE club_memberships SET status='left' WHERE user_id=?").run(req.user.id);
  res.json({ ok: true });
});

// 승인된 회원 목록
router.get('/members', authMiddleware, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.nickname, u.role, u.avatar_color, u.created_at,
           COUNT(w.id) as total_workouts,
           COALESCE(SUM(w.distance_km), 0) as total_km
    FROM users u
    JOIN club_memberships cm ON cm.user_id = u.id AND cm.status = 'approved'
    LEFT JOIN workout_logs w ON u.id = w.user_id AND w.status = 'approved'
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
