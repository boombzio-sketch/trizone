const router = require('express').Router()
const { prepare, pool } = require('../db')
const { authMiddleware } = require('../middleware')
const db = { prepare }

async function isStaff(userId) {
  const { rows } = await pool.query('SELECT role, can_approve FROM users WHERE id = $1', [userId])
  const u = rows[0]
  return u && (u.role === 'admin' || u.can_approve)
}

const THREAD_COLS = `
  SELECT m.*, u.nickname as from_nickname, u.avatar_color as from_avatar_color, u.avatar_image as from_avatar_image
  FROM messages m JOIN users u ON m.from_user_id = u.id`

// 쪽지 보내기 (모든 회원)
router.post('/', authMiddleware, async (req, res) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: '내용을 입력하세요.' })
  const result = await db.prepare('INSERT INTO messages (from_user_id, body) VALUES (?,?)').run(req.user.id, body.trim())
  res.json(await db.prepare(`${THREAD_COLS} WHERE m.id=?`).get(result.lastInsertRowid))
})

// 내 문의 내역
router.get('/mine', authMiddleware, async (req, res) => {
  const rows = await db.prepare(`
    SELECT m.*, u.nickname as from_nickname, u.avatar_color as from_avatar_color, u.avatar_image as from_avatar_image,
      (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) as reply_count,
      (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id AND r.from_user_id != m.from_user_id) as unread_replies
    FROM messages m JOIN users u ON m.from_user_id = u.id
    WHERE m.from_user_id = ? AND m.parent_id IS NULL
    ORDER BY m.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

// 받은 쪽지 목록 (관리자)
router.get('/inbox', authMiddleware, async (req, res) => {
  if (!await isStaff(req.user.id))
    return res.status(403).json({ error: '권한이 없습니다.' })
  const rows = await db.prepare(`
    SELECT m.*, u.nickname as from_nickname, u.avatar_color as from_avatar_color, u.avatar_image as from_avatar_image,
      (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) as reply_count
    FROM messages m JOIN users u ON m.from_user_id = u.id
    WHERE m.parent_id IS NULL
    ORDER BY m.created_at DESC
  `).all()
  res.json(rows)
})

// 스레드 조회 (원본 + 답장)
router.get('/:id/thread', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  const original = await db.prepare(`${THREAD_COLS} WHERE m.id=?`).get(id)
  if (!original) return res.status(404).json({ error: '쪽지를 찾을 수 없습니다.' })
  const staff = await isStaff(req.user.id)
  if (!staff && original.from_user_id !== req.user.id)
    return res.status(403).json({ error: '권한이 없습니다.' })
  const replies = await db.prepare(`${THREAD_COLS} WHERE m.parent_id=? ORDER BY m.created_at ASC`).all(id)
  if (staff) {
    await db.prepare('UPDATE messages SET is_read=true WHERE id=?').run(id)
  }
  res.json({ original, replies })
})

// 답장 (관리자)
router.post('/:id/reply', authMiddleware, async (req, res) => {
  if (!await isStaff(req.user.id))
    return res.status(403).json({ error: '권한이 없습니다.' })
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: '내용을 입력하세요.' })
  const parentId = Number(req.params.id)
  await db.prepare('UPDATE messages SET is_read=true WHERE id=?').run(parentId)
  const result = await db.prepare('INSERT INTO messages (from_user_id, body, parent_id) VALUES (?,?,?)').run(req.user.id, body.trim(), parentId)
  res.json(await db.prepare(`${THREAD_COLS} WHERE m.id=?`).get(result.lastInsertRowid))
})

// 쪽지 삭제 (본인 또는 관리자)
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  const msg = await db.prepare('SELECT * FROM messages WHERE id=?').get(id)
  if (!msg) return res.status(404).json({ error: '쪽지를 찾을 수 없습니다.' })
  if (req.user.role !== 'admin' && msg.from_user_id !== req.user.id)
    return res.status(403).json({ error: '권한이 없습니다.' })
  await db.prepare('DELETE FROM messages WHERE id=? OR parent_id=?').run(id, id)
  res.json({ ok: true })
})

module.exports = router
