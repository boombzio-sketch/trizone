const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');
const db = { prepare };

// 목록 조회 (인증 사용자 전체)
router.get('/', authMiddleware, async (req, res) => {
  const rows = await db.prepare(`
    SELECT n.*, u.nickname AS author_nickname
    FROM notices n
    JOIN users u ON n.created_by = u.id
    ORDER BY n.pinned DESC, n.created_at DESC
  `).all();
  res.json(rows);
});

// 단건 조회
router.get('/:id', authMiddleware, async (req, res) => {
  const row = await db.prepare(`
    SELECT n.*, u.nickname AS author_nickname
    FROM notices n
    JOIN users u ON n.created_by = u.id
    WHERE n.id = ?
  `).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
  res.json(row);
});

// 작성 (관리자 전용)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, body, pinned, photos } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: '제목을 입력하세요.' });
  const result = await db.prepare(`
    INSERT INTO notices (title, body, photos, pinned, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(title.trim(), body || '', JSON.stringify(photos || []), pinned ? true : false, req.user.id);
  const row = await db.prepare('SELECT n.*, u.nickname AS author_nickname FROM notices n JOIN users u ON n.created_by = u.id WHERE n.id = ?').get(result.lastInsertRowid);
  res.json(row);
});

// 수정 (관리자 전용)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { title, body, pinned, photos } = req.body;
  const row = await db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
  await db.prepare(`
    UPDATE notices SET title=?, body=?, photos=?, pinned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(
    title?.trim() ?? row.title,
    body !== undefined ? body : row.body,
    photos !== undefined ? JSON.stringify(photos) : (row.photos ?? '[]'),
    pinned !== undefined ? pinned : row.pinned,
    id
  );
  const updated = await db.prepare('SELECT n.*, u.nickname AS author_nickname FROM notices n JOIN users u ON n.created_by = u.id WHERE n.id = ?').get(id);
  res.json(updated);
});

// 삭제 (관리자 전용)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
  await db.prepare('DELETE FROM notices WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
