const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');

// 대회 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  const rows = await prepare(`
    SELECT r.*, u.nickname as created_by_name
    FROM races r
    JOIN users u ON r.created_by = u.id
    ORDER BY r.date ASC
  `).all();
  res.json(rows);
});

// 대회 등록 (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, date, location, distance, category, entry_fee, reg_url, capacity, reg_start, reg_end } = req.body;
  if (!name || !date || !location || !distance)
    return res.status(400).json({ error: '대회명, 날짜, 장소, 종목은 필수입니다.' });

  const result = await prepare(`
    INSERT INTO races (name, date, location, distance, category, entry_fee, reg_url, capacity, reg_start, reg_end, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, date, location, distance, category || 'triathlon', entry_fee || 0, reg_url || '', capacity || 0, reg_start || null, reg_end || null, req.user.id);

  const row = await prepare('SELECT * FROM races WHERE id = ?').get(result.lastInsertRowid);
  res.json(row);
});

// 대회 수정 (admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, date, location, distance, category, entry_fee, reg_url, capacity, reg_start, reg_end } = req.body;
  if (!name || !date || !location || !distance)
    return res.status(400).json({ error: '대회명, 날짜, 장소, 종목은 필수입니다.' });

  const id = Number(req.params.id);
  const row = await prepare('SELECT id FROM races WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });

  await prepare(`
    UPDATE races SET name=?, date=?, location=?, distance=?, category=?, entry_fee=?, reg_url=?, capacity=?, reg_start=?, reg_end=?
    WHERE id=?
  `).run(name, date, location, distance, category || 'triathlon', entry_fee || 0, reg_url || '', capacity || 0, reg_start || null, reg_end || null, id);

  res.json(await prepare('SELECT * FROM races WHERE id = ?').get(id));
});

// 대회 삭제 (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const row = await prepare('SELECT id FROM races WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
  await prepare('DELETE FROM races WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
