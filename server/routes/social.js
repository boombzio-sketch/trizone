const router = require('express').Router()
const { prepare } = require('../db')
const { authMiddleware } = require('../middleware')
const db = { prepare }

// ── 팔로우 ──────────────────────────────────────────
// 팔로우하기
router.post('/follow/:targetId', authMiddleware, async (req, res) => {
  const me = req.user.id
  const target = Number(req.params.targetId)
  if (me === target) return res.status(400).json({ error: '자기 자신은 팔로우할 수 없습니다.' })
  await db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?,?)').run(me, target)
  res.json({ ok: true, following: true })
})

// 언팔로우
router.delete('/follow/:targetId', authMiddleware, async (req, res) => {
  await db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.user.id, Number(req.params.targetId))
  res.json({ ok: true, following: false })
})

// 팔로우 상태 조회
router.get('/follow/:targetId', authMiddleware, async (req, res) => {
  const row = await db.prepare('SELECT id FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, Number(req.params.targetId))
  res.json({ following: !!row })
})

// 내 팔로워/팔로잉 목록
router.get('/followers/:userId', authMiddleware, async (req, res) => {
  const rows = await db.prepare(`
    SELECT u.id, u.nickname, u.avatar_color,
      CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as i_follow
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id=? AND f2.following_id=u.id
    WHERE f.following_id=?
  `).all(req.user.id, Number(req.params.userId))
  res.json(rows)
})

router.get('/following/:userId', authMiddleware, async (req, res) => {
  const rows = await db.prepare(`
    SELECT u.id, u.nickname, u.avatar_color,
      CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as i_follow
    FROM follows f
    JOIN users u ON f.following_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id=? AND f2.following_id=u.id
    WHERE f.follower_id=?
  `).all(req.user.id, Number(req.params.userId))
  res.json(rows)
})

// ── 피드 ──────────────────────────────────────────
// ⚠ 사진은 base64로 DB에 저장돼 있어 photos를 그대로 내려보내면 응답이 수십 MB가 됨.
//   피드 목록에는 표지(photo)만 보내고, 사진 갯수(photo_count)만 함께 제공.
//   전체 사진은 GET /social/workout/:id/photos 로 lazy load.
const FEED_COLS = `
    SELECT w.id, w.user_id, w.sport_type, w.logged_at, w.distance_km, w.duration_sec,
           w.memo, w.pace, w.score, w.brick_segments, w.status, w.photo,
           CASE
             WHEN w.photos IS NULL OR w.photos = '' OR w.photos = '[]' THEN 0
             ELSE COALESCE(json_array_length(w.photos::json), 0)
           END as photo_count,
           COALESCE(w.visibility, 'public') as visibility,
           w.pool_type, w.elevation_m, w.course_type, w.avg_power_w,
           u.nickname, u.avatar_color, u.avatar_image,
      (SELECT COUNT(*) FROM likes WHERE workout_id=w.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE workout_id=w.id) as comment_count,
      (SELECT id FROM likes WHERE workout_id=w.id AND user_id=?) as my_like,
      (SELECT COALESCE(SUM(amount),0) FROM point_transactions WHERE workout_id=w.id AND type='auto') as points_earned
    FROM workout_logs w
    JOIN users u ON w.user_id = u.id`

// 팔로잉 피드
router.get('/feed', authMiddleware, async (req, res) => {
  const { offset = 0 } = req.query
  const rows = await db.prepare(`${FEED_COLS}
    WHERE (
      w.user_id = ?
      OR (w.user_id IN (SELECT following_id FROM follows WHERE follower_id=?)
          AND COALESCE(w.visibility,'public') IN ('public','followers','club_followers')
          AND w.status = 'approved')
    )
    AND w.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id=?)
    ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, Number(offset))
  res.json(rows)
})

// 클럽 피드 (어드민: 전체 승인 기록, 일반: 공유 클럽 회원 기록)
router.get('/feed/club', authMiddleware, async (req, res) => {
  const { offset = 0, club_id } = req.query
  const isAdmin = req.user.role === 'admin'
  const clubId  = club_id ? Number(club_id) : null
  let rows

  if (isAdmin) {
    rows = clubId
      ? await db.prepare(`${FEED_COLS}
          WHERE w.status = 'approved'
          AND EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.user_id = w.user_id AND cm.club_id = ? AND cm.status = 'approved'
          )
          ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
        `).all(req.user.id, clubId, Number(offset))
      : await db.prepare(`${FEED_COLS}
          WHERE w.status = 'approved'
          ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
        `).all(req.user.id, Number(offset))
  } else if (clubId) {
    // 특정 클럽만: 나의 게시물 + 해당 클럽 회원들의 공개 기록
    rows = await db.prepare(`${FEED_COLS}
      WHERE (
        w.user_id = ?
        OR (COALESCE(w.visibility,'public') IN ('public','club','club_followers')
            AND w.status = 'approved'
            AND EXISTS (
              SELECT 1 FROM club_memberships cm1
              JOIN club_memberships cm2 ON cm1.club_id = cm2.club_id
              WHERE cm1.user_id = w.user_id AND cm1.status = 'approved'
                AND cm2.user_id = ? AND cm2.status = 'approved'
                AND cm1.club_id = ?
            ))
      )
      AND w.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id=?)
      ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
    `).all(req.user.id, req.user.id, req.user.id, clubId, req.user.id, Number(offset))
  } else {
    // 전체 클럽 합산 (기존 동작)
    rows = await db.prepare(`${FEED_COLS}
      WHERE (
        w.user_id = ?
        OR (COALESCE(w.visibility,'public') IN ('public','club','club_followers')
            AND w.status = 'approved'
            AND EXISTS (
              SELECT 1 FROM club_memberships cm1
              JOIN club_memberships cm2 ON cm1.club_id = cm2.club_id
              WHERE cm1.user_id = w.user_id AND cm1.status = 'approved'
                AND cm2.user_id = ? AND cm2.status = 'approved'
            ))
      )
      AND w.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id=?)
      ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
    `).all(req.user.id, req.user.id, req.user.id, req.user.id, Number(offset))
  }

  res.json(rows)
})

// 내 피드
router.get('/feed/mine', authMiddleware, async (req, res) => {
  const { offset = 0 } = req.query
  const rows = await db.prepare(`${FEED_COLS}
    WHERE w.user_id = ?
    ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
  `).all(req.user.id, req.user.id, Number(offset))
  res.json(rows)
})

// 전체 피드 (어드민: 가시성 무관 전체, 일반: public만)
router.get('/feed/all', authMiddleware, async (req, res) => {
  const { offset = 0 } = req.query
  const isAdmin = req.user.role === 'admin'
  const rows = isAdmin
    ? await db.prepare(`${FEED_COLS}
        WHERE w.status = 'approved'
        ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
      `).all(req.user.id, Number(offset))
    : await db.prepare(`${FEED_COLS}
        WHERE COALESCE(w.visibility,'public') = 'public' AND w.status = 'approved'
        AND w.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id=?)
        ORDER BY w.logged_at DESC, w.created_at DESC LIMIT 20 OFFSET ?
      `).all(req.user.id, req.user.id, Number(offset))
  res.json(rows)
})

// 단일 기록의 사진 전체 (피드에서는 표지만 보내고 필요할 때 별도 호출)
router.get('/workout/:id/photos', authMiddleware, async (req, res) => {
  const wid = Number(req.params.id)
  if (!await canAccessWorkout(wid, req.user.id)) return res.status(403).json({ error: '접근할 수 없는 기록입니다.' })
  const row = await db.prepare('SELECT photos, cover_photo_index FROM workout_logs WHERE id=?').get(wid)
  let photos = []
  try { photos = JSON.parse(row?.photos || '[]') } catch {}
  res.json({ photos, cover_photo_index: row?.cover_photo_index || 0 })
})

// 기록 접근 가능 여부 확인 헬퍼
async function canAccessWorkout(workoutId, userId) {
  const w = await db.prepare('SELECT user_id, visibility, status FROM workout_logs WHERE id=?').get(workoutId)
  if (!w) return false
  if (w.user_id === userId) return true         // 본인
  if (w.status !== 'approved') return false     // 미승인
  if (w.visibility === 'private') return false  // 비공개
  const blocked = await db.prepare(`
    SELECT id FROM blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)
  `).get(userId, w.user_id, w.user_id, userId)
  if (blocked) return false                     // 차단 관계: 양방향 접근 차단
  return true
}

// ── 좋아요 ──────────────────────────────────────────
router.post('/like/:workoutId', authMiddleware, async (req, res) => {
  const wid = Number(req.params.workoutId)
  if (!await canAccessWorkout(wid, req.user.id)) return res.status(403).json({ error: '접근할 수 없는 기록입니다.' })
  const existing = await db.prepare('SELECT id FROM likes WHERE workout_id=? AND user_id=?').get(wid, req.user.id)
  if (existing) {
    await db.prepare('DELETE FROM likes WHERE workout_id=? AND user_id=?').run(wid, req.user.id)
    const cnt = await db.prepare('SELECT COUNT(*)::int as c FROM likes WHERE workout_id=?').get(wid)
    return res.json({ liked: false, count: cnt.c })
  }
  await db.prepare('INSERT INTO likes (workout_id, user_id) VALUES (?,?)').run(wid, req.user.id)
  const cnt = await db.prepare('SELECT COUNT(*)::int as c FROM likes WHERE workout_id=?').get(wid)
  res.json({ liked: true, count: cnt.c })
})

// 좋아요 누른 사람 목록
router.get('/likes/:workoutId', authMiddleware, async (req, res) => {
  const wid = Number(req.params.workoutId)
  if (!await canAccessWorkout(wid, req.user.id)) return res.status(403).json({ error: '접근할 수 없는 기록입니다.' })
  const rows = await db.prepare(`
    SELECT u.id, u.nickname, u.avatar_color, u.avatar_image
    FROM likes l JOIN users u ON l.user_id = u.id
    WHERE l.workout_id = ?
    ORDER BY l.created_at DESC
  `).all(wid)
  res.json(rows)
})

// ── 댓글 ──────────────────────────────────────────
router.get('/comments/:workoutId', authMiddleware, async (req, res) => {
  const wid = Number(req.params.workoutId)
  if (!await canAccessWorkout(wid, req.user.id)) return res.status(403).json({ error: '접근할 수 없는 기록입니다.' })
  const rows = await db.prepare(`
    SELECT c.*, u.nickname, u.avatar_color
    FROM comments c JOIN users u ON c.user_id=u.id
    WHERE c.workout_id=? AND c.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id=?)
    ORDER BY c.created_at ASC
  `).all(wid, req.user.id)
  res.json(rows)
})

router.post('/comments/:workoutId', authMiddleware, async (req, res) => {
  const wid = Number(req.params.workoutId)
  if (!await canAccessWorkout(wid, req.user.id)) return res.status(403).json({ error: '접근할 수 없는 기록입니다.' })
  const { body, parent_id } = req.body
  if (!body?.trim()) return res.status(400).json({ error: '댓글 내용을 입력하세요.' })
  const result = await db.prepare('INSERT INTO comments (workout_id, user_id, body, parent_id) VALUES (?,?,?,?)').run(wid, req.user.id, body.trim(), parent_id || null)
  const row = await db.prepare(`SELECT c.*, u.nickname, u.avatar_color FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?`).get(result.lastInsertRowid)
  res.json(row)
})

router.delete('/comments/:commentId', authMiddleware, async (req, res) => {
  const c = await db.prepare('SELECT * FROM comments WHERE id=?').get(Number(req.params.commentId))
  if (!c) return res.status(404).json({ error: '댓글이 없습니다.' })
  if (c.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '권한이 없습니다.' })
  await db.prepare('DELETE FROM comments WHERE id=?').run(Number(req.params.commentId))
  res.json({ ok: true })
})

// ── 차단 ──────────────────────────────────────────
router.get('/blocks', authMiddleware, async (req, res) => {
  const rows = await db.prepare(`
    SELECT u.id, u.nickname, u.avatar_color, u.avatar_image
    FROM blocks b JOIN users u ON b.blocked_id = u.id
    WHERE b.blocker_id=? ORDER BY b.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

router.post('/blocks/:targetId', authMiddleware, async (req, res) => {
  const target = Number(req.params.targetId)
  if (target === req.user.id) return res.status(400).json({ error: '자기 자신은 차단할 수 없습니다.' })
  await db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?,?)').run(req.user.id, target)
  res.json({ ok: true, blocked: true })
})

router.delete('/blocks/:targetId', authMiddleware, async (req, res) => {
  await db.prepare('DELETE FROM blocks WHERE blocker_id=? AND blocked_id=?').run(req.user.id, Number(req.params.targetId))
  res.json({ ok: true, blocked: false })
})

// ── 신고 ──────────────────────────────────────────
router.post('/reports', authMiddleware, async (req, res) => {
  const { target_type, target_id, reason } = req.body
  if (!['workout', 'comment'].includes(target_type)) return res.status(400).json({ error: '유효하지 않은 신고 대상입니다.' })
  if (!target_id) return res.status(400).json({ error: '신고 대상을 확인하세요.' })
  await db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?,?,?,?)')
    .run(req.user.id, target_type, Number(target_id), (reason || '').toString().slice(0, 300))
  res.json({ ok: true })
})

// ── 유저 검색 ──────────────────────────────────────────
router.get('/users/search', authMiddleware, async (req, res) => {
  const { q = '' } = req.query
  if (!q.trim()) return res.json([])
  const rows = await db.prepare(`
    SELECT u.id, u.nickname, u.avatar_color,
      (SELECT COUNT(*) FROM follows WHERE following_id=u.id) as follower_count,
      CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as i_follow
    FROM users u
    LEFT JOIN follows f ON f.follower_id=? AND f.following_id=u.id
    WHERE u.nickname ILIKE ? AND u.id != ?
    LIMIT 20
  `).all(req.user.id, '%' + q.replace(/[%_\\]/g, '\\$&') + '%', req.user.id)
  res.json(rows)
})

// 미확인 알림 수 (내 기록에 달린 새 댓글)
router.get('/notifications/unread', authMiddleware, async (req, res) => {
  const since = req.query.since || '1970-01-01'
  const row = await db.prepare(`
    SELECT COUNT(*)::int as c FROM comments c
    JOIN workout_logs w ON c.workout_id = w.id
    WHERE w.user_id = ? AND c.user_id != ? AND c.created_at > ?
  `).get(req.user.id, req.user.id, since)
  res.json({ count: row.c })
})

// 유저 프로필 (팔로우 수 포함)
router.get('/profile/:userId', authMiddleware, async (req, res) => {
  const uid = Number(req.params.userId)
  const user = await db.prepare('SELECT id,nickname,avatar_color,role,created_at FROM users WHERE id=?').get(uid)
  if (!user) return res.status(404).json({ error: '없는 유저입니다.' })
  const followers = await db.prepare('SELECT COUNT(*)::int as c FROM follows WHERE following_id=?').get(uid)
  const following = await db.prepare('SELECT COUNT(*)::int as c FROM follows WHERE follower_id=?').get(uid)
  const iFollow = await db.prepare('SELECT id FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, uid)
  const stats = await db.prepare(`SELECT sport_type, SUM(distance_km) as km, COUNT(*) as cnt FROM workout_logs WHERE user_id=? AND status='approved' GROUP BY sport_type`).all(uid)
  const isSelf = req.user.id === uid
  const recentWorkouts = await db.prepare(`
    SELECT w.*,
      (SELECT COUNT(*) FROM likes WHERE workout_id=w.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE workout_id=w.id) as comment_count,
      (SELECT id FROM likes WHERE workout_id=w.id AND user_id=?) as my_like
    FROM workout_logs w
    WHERE w.user_id=? AND w.status='approved'
    ${isSelf ? '' : "AND w.visibility = 'public'"}
    ORDER BY w.logged_at DESC LIMIT 10
  `).all(req.user.id, uid)
  res.json({ user, follower_count: followers.c, following_count: following.c, i_follow: !!iFollow, stats, recentWorkouts })
})

module.exports = router
