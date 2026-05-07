const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware, canApproveMiddleware } = require('../middleware');

const adminOnly   = [authMiddleware, adminMiddleware];
const approveOnly = [authMiddleware, canApproveMiddleware];

// 전체 회원 목록
router.get('/members', ...adminOnly, async (req, res) => {
  const members = await prepare(`
    SELECT u.id, u.nickname, u.role, u.avatar_color, u.avatar_image, u.created_at, u.can_approve,
           COUNT(w.id) as workout_count
    FROM users u
    LEFT JOIN workout_logs w ON w.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at ASC
  `).all();
  res.json(members);
});

// 회원 정보 수정
router.put('/members/:id', ...adminOnly, async (req, res) => {
  const { nickname, avatar_color, avatar_image, password } = req.body;
  if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력하세요.' });

  const uid = Number(req.params.id);
  const exists = await prepare('SELECT id FROM users WHERE nickname=? AND id!=?').get(nickname.trim(), uid);
  if (exists) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  if (password) {
    if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 10);
    await prepare('UPDATE users SET nickname=?, avatar_color=?, avatar_image=?, password_hash=? WHERE id=?').run(nickname.trim(), avatar_color || '#4DB8FF', avatar_image ?? null, hash, uid);
  } else {
    await prepare('UPDATE users SET nickname=?, avatar_color=?, avatar_image=? WHERE id=?').run(nickname.trim(), avatar_color || '#4DB8FF', avatar_image ?? null, uid);
  }

  res.json(await prepare('SELECT id, nickname, role, avatar_color, avatar_image, created_at FROM users WHERE id=?').get(uid));
});

// 역할 변경
router.put('/members/:id/role', ...adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role))
    return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: '자신의 역할은 변경할 수 없습니다.' });
  await prepare('UPDATE users SET role = ? WHERE id = ?').run(role, Number(req.params.id));
  res.json({ ok: true });
});

// 훈련 승인 권한 부여/회수
router.put('/members/:id/can-approve', ...adminOnly, async (req, res) => {
  const { can_approve } = req.body;
  await prepare('UPDATE users SET can_approve = ? WHERE id = ?').run(!!can_approve, Number(req.params.id));
  res.json({ ok: true });
});

// 회원 삭제
router.delete('/members/:id', ...adminOnly, async (req, res) => {
  const uid = Number(req.params.id);
  if (uid === req.user.id)
    return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
  const user = await prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });

  await prepare('DELETE FROM workout_logs WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(uid, uid);
  await prepare('DELETE FROM likes WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM comments WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM club_memberships WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM club_leader_applications WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM club_training_participants WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM users WHERE id = ?').run(uid);

  const check = await prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (check) return res.status(500).json({ error: '삭제에 실패했습니다.' });

  res.json({ ok: true });
});

// 클럽장 신청 목록
router.get('/club-leader-apps', ...adminOnly, async (req, res) => {
  const rows = await prepare(`
    SELECT cla.*, u.nickname, u.avatar_color
    FROM club_leader_applications cla JOIN users u ON cla.user_id=u.id
    WHERE cla.status='pending' ORDER BY cla.applied_at ASC
  `).all();
  res.json(rows);
});

// 클럽장 신청 승인/거절
router.put('/club-leader-apps/:userId/status', ...adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  await prepare('UPDATE club_leader_applications SET status=? WHERE user_id=?').run(status, Number(req.params.userId));
  res.json({ ok: true });
});

// 클럽 가입 신청 목록
router.get('/memberships', ...adminOnly, async (req, res) => {
  const rows = await prepare(`
    SELECT cm.id, cm.club_id, cm.user_id, cm.status, cm.message, cm.applied_at,
           u.nickname, u.avatar_color, u.created_at as user_created_at
    FROM club_memberships cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.status = 'pending'
    ORDER BY cm.applied_at ASC
  `).all();
  res.json(rows);
});

// 가입 승인/거절 (club_id + user_id 조합으로 특정)
router.put('/memberships/:clubId/:userId/status', ...adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  await prepare('UPDATE club_memberships SET status=? WHERE club_id=? AND user_id=?').run(
    status, Number(req.params.clubId), Number(req.params.userId)
  );
  res.json({ ok: true });
});

// 훈련 기록 승인 대기 목록 (승인 권한자 접근 가능)
router.get('/pending', ...approveOnly, async (req, res) => {
  const rows = await prepare(`
    SELECT w.id, w.sport_type, w.logged_at, w.distance_km, w.duration_sec,
           w.memo, w.score, w.brick_segments, w.photo,
           COALESCE(w.photos, '[]') as photos,
           COALESCE(w.cover_photo_index, 0) as cover_photo_index,
           w.pool_type, w.elevation_m, w.course_type, w.avg_power_w,
           w.status, w.created_at,
           u.nickname, u.avatar_color
    FROM workout_logs w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'pending'
    ORDER BY w.created_at DESC
  `).all();
  res.json(rows);
});

// 기록 승인/반려 (승인 권한자 접근 가능)
router.put('/workouts/:id/status', ...approveOnly, async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  const row = await prepare('SELECT status FROM workout_logs WHERE id=?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });
  if (row.status !== 'pending') return res.status(400).json({ error: '대기 중인 기록만 처리할 수 있습니다.' });
  await prepare('UPDATE workout_logs SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.json({ ok: true });
});

// 기록 내용 수정 (승인 권한자 접근 가능)
router.put('/workouts/:id/edit', ...approveOnly, async (req, res) => {
  const id = Number(req.params.id);
  const { distance_km, duration_sec, memo, logged_at, brick_segments } = req.body;

  const row = await prepare('SELECT * FROM workout_logs WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });
  // 관리자가 아닌 승인권한자는 pending 상태 기록만 수정 가능
  if (req.user.role !== 'admin' && row.status !== 'pending')
    return res.status(403).json({ error: '승인 대기 기록만 수정할 수 있습니다.' });

  const newDist  = distance_km  !== undefined ? Number(distance_km)  : row.distance_km;
  const newDur   = duration_sec !== undefined ? Number(duration_sec) : row.duration_sec;
  const newBrick = brick_segments ? JSON.stringify(brick_segments)   : row.brick_segments;
  const newMemo  = memo      !== undefined ? memo      : row.memo;
  const newDate  = logged_at !== undefined ? logged_at : row.logged_at;

  function calcPace(sport, dist, dur) {
    if (!dist || !dur) return 0;
    if (sport === 'swim') return (dur / 60) / (dist * 10);
    if (sport === 'bike') return dist / (dur / 3600);
    if (sport === 'run')  return (dur / 60) / dist;
    return 0;
  }
  function calcScore(sport, dist, brickJson) {
    if (sport === 'brick') {
      try {
        const segs = JSON.parse(brickJson || '[]');
        let base = 0;
        for (const s of segs) {
          if (s.sport === 'swim') base += (s.distance_km || 0) * 3.0;
          else if (s.sport === 'bike') base += (s.distance_km || 0) * 1.0;
          else if (s.sport === 'run')  base += (s.distance_km || 0) * 2.0;
        }
        return base * 1.5;
      } catch { return 0; }
    }
    if (sport === 'swim') return dist * 3.0;
    if (sport === 'bike') return dist * 1.0;
    if (sport === 'run')  return dist * 2.0;
    return 0;
  }

  const newPace  = calcPace(row.sport_type, newDist, newDur);
  const newScore = calcScore(row.sport_type, newDist, newBrick);

  await prepare(`
    UPDATE workout_logs
    SET distance_km=?, duration_sec=?, memo=?, logged_at=?, brick_segments=?, pace=?, score=?
    WHERE id=?
  `).run(newDist, newDur, newMemo, newDate, newBrick, newPace, newScore, id);

  res.json(await prepare('SELECT * FROM workout_logs WHERE id=?').get(id));
});

module.exports = router;
