const router = require('express').Router();
const { prepare } = require('../db');
const { MONTHLY_CAP } = require('../points');
const { authMiddleware, adminMiddleware, canApproveMiddleware } = require('../middleware');

const adminOnly   = [authMiddleware, adminMiddleware];
// 기록 수정 권한자(can_approve) 또는 관리자. 과거 '훈련 승인' 권한을 기록 수정 권한으로 재활용.
const editOnly    = [authMiddleware, canApproveMiddleware];

// 전체 회원 목록
router.get('/members', ...adminOnly, async (req, res) => {
  const members = await prepare(`
    SELECT u.id, u.nickname, u.email, u.role, u.avatar_color, u.avatar_image, u.created_at, u.can_approve,
           COUNT(w.id) as workout_count
    FROM users u
    LEFT JOIN workout_logs w ON w.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(members);
});

// 회원 정보 수정
router.put('/members/:id', ...adminOnly, async (req, res) => {
  const { nickname, avatar_color, avatar_image, password, email } = req.body;
  if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력하세요.' });

  const uid = Number(req.params.id);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const nickExists = await prepare('SELECT id FROM users WHERE nickname=? AND id!=?').get(nickname.trim(), uid);
  if (nickExists) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;
  if (normalizedEmail) {
    if (!EMAIL_RE.test(normalizedEmail)) return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
    const emailExists = await prepare('SELECT id FROM users WHERE email=? AND id!=?').get(normalizedEmail, uid);
    if (emailExists) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
  }

  const bcrypt = require('bcryptjs');
  if (password) {
    if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    const hash = bcrypt.hashSync(password, 10);
    await prepare('UPDATE users SET nickname=?, email=?, avatar_color=?, avatar_image=?, password_hash=? WHERE id=?')
      .run(nickname.trim(), normalizedEmail, avatar_color || '#4DB8FF', avatar_image ?? null, hash, uid);
  } else {
    await prepare('UPDATE users SET nickname=?, email=?, avatar_color=?, avatar_image=? WHERE id=?')
      .run(nickname.trim(), normalizedEmail, avatar_color || '#4DB8FF', avatar_image ?? null, uid);
  }

  res.json(await prepare('SELECT id, nickname, email, role, avatar_color, avatar_image, created_at FROM users WHERE id=?').get(uid));
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
  await prepare('DELETE FROM point_transactions WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM users WHERE id = ?').run(uid);

  const check = await prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (check) return res.status(500).json({ error: '삭제에 실패했습니다.' });

  res.json({ ok: true });
});

// 비밀번호 재설정 코드 발급
router.post('/members/:id/reset-token', ...adminOnly, async (req, res) => {
  const uid = Number(req.params.id);
  const user = await prepare('SELECT id, email, nickname FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(code, expires, uid);

  // 이메일이 등록된 경우 자동 발송
  if (user.email && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'TRIZONE <noreply@trizone.co.kr>',
        to: user.email,
        subject: '[TRIZONE] 비밀번호 재설정 코드',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px 24px">
            <div style="font-size:24px;font-weight:900;letter-spacing:2px;margin-bottom:8px">
              TRI<span style="color:#f97316">ZONE</span>
            </div>
            <h2 style="font-size:18px;margin:24px 0 8px">비밀번호 재설정 코드</h2>
            <p style="color:#64748b;font-size:14px;margin-bottom:24px">
              안녕하세요, ${user.nickname}님.<br>
              아래 코드를 로그인 화면의 <strong>비밀번호 찾기</strong>에 입력하세요.
            </p>
            <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;font-size:32px;font-weight:900;letter-spacing:8px;color:#1e293b;margin-bottom:16px">
              ${code}
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center">
              이 코드는 <strong>30분</strong>간 유효하며 한 번만 사용할 수 있습니다.
            </p>
          </div>
        `,
      });
      return res.json({ sent: true, email: user.email });
    } catch (e) {
      console.error('[resend error]', e.message);
      // 발송 실패 시 코드를 반환해 관리자가 직접 전달할 수 있도록
      return res.json({ sent: false, code });
    }
  }

  res.json({ sent: false, code });
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

// 전체 훈련 기록 목록 (승인 폐지 이후 관리자/수정권한자 열람·수정용)
router.get('/all-workouts', ...editOnly, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const offset = Number(req.query.offset) || 0;
  const rows = await prepare(`
    SELECT w.id, w.user_id, w.sport_type, w.logged_at, w.distance_km, w.duration_sec,
           w.memo, w.score, w.brick_segments, w.photo,
           COALESCE(w.photos, '[]') as photos,
           COALESCE(w.cover_photo_index, 0) as cover_photo_index,
           w.pool_type, w.elevation_m, w.course_type, w.avg_power_w,
           w.status, w.created_at,
           u.nickname, u.avatar_color
    FROM workout_logs w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json(rows);
});

// 기록 내용 수정 (수정 권한자 접근 가능)
router.put('/workouts/:id/edit', ...editOnly, async (req, res) => {
  const id = Number(req.params.id);
  const { distance_km, duration_sec, memo, logged_at, brick_segments } = req.body;

  const row = await prepare('SELECT * FROM workout_logs WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

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

// ── 포인트 관리 (관리자 전용) ──────────────────────────────

// 자동지급 설정 조회
router.get('/points/settings', ...adminOnly, async (req, res) => {
  const s = await prepare('SELECT auto_enabled, period_start, period_end FROM point_settings WHERE id=1').get();
  res.json({ ...(s || { auto_enabled: true, period_start: null, period_end: null }), monthly_cap: MONTHLY_CAP });
});

// 자동지급 설정 변경 (기간 설정 / 자동지급 on·off)
router.put('/points/settings', ...adminOnly, async (req, res) => {
  const { auto_enabled, period_start, period_end } = req.body;
  await prepare(
    `UPDATE point_settings
     SET auto_enabled=?, period_start=?, period_end=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=1`
  ).run(!!auto_enabled, period_start || null, period_end || null);
  const s = await prepare('SELECT auto_enabled, period_start, period_end FROM point_settings WHERE id=1').get();
  res.json({ ...s, monthly_cap: MONTHLY_CAP });
});

// 회원별 포인트 현황 (잔액 + 이번달 자동적립)
router.get('/points/members', ...adminOnly, async (req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const rows = await prepare(`
    SELECT u.id, u.nickname, u.avatar_color, u.avatar_image,
           COALESCE(SUM(pt.amount), 0) AS balance,
           COALESCE(SUM(CASE WHEN pt.type='auto' AND to_char(pt.earned_date,'YYYY-MM')=? THEN pt.amount ELSE 0 END), 0) AS month_accrued
    FROM users u
    LEFT JOIN point_transactions pt ON pt.user_id = u.id
    GROUP BY u.id
    ORDER BY balance DESC, u.nickname ASC
  `).all(month);
  res.json(rows);
});

// 특정 회원 적립 내역
router.get('/points/:userId/transactions', ...adminOnly, async (req, res) => {
  const rows = await prepare(`
    SELECT id, amount, type, sport_type, earned_date, memo, created_by, created_at
    FROM point_transactions WHERE user_id=?
    ORDER BY created_at DESC LIMIT 200
  `).all(Number(req.params.userId));
  res.json(rows);
});

// 수동 지급 (양수) / 차감 (음수)
router.post('/points/:userId/grant', ...adminOnly, async (req, res) => {
  const userId = Number(req.params.userId);
  const amount = Math.trunc(Number(req.body.amount));
  const memo = (req.body.memo || '').toString().slice(0, 200);
  if (!Number.isFinite(amount) || amount === 0)
    return res.status(400).json({ error: '0이 아닌 포인트를 입력하세요.' });
  const user = await prepare('SELECT id FROM users WHERE id=?').get(userId);
  if (!user) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });

  const today = new Date().toISOString().slice(0, 10);
  const result = await prepare(
    `INSERT INTO point_transactions (user_id, amount, type, earned_date, memo, created_by)
     VALUES (?, ?, 'manual', ?, ?, ?)`
  ).run(userId, amount, today, memo, req.user.id);
  res.json(await prepare('SELECT * FROM point_transactions WHERE id=?').get(result.lastInsertRowid));
});

// 적립 내역 수정 (금액/메모)
router.put('/points/tx/:id', ...adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const row = await prepare('SELECT * FROM point_transactions WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: '내역을 찾을 수 없습니다.' });

  const amount = req.body.amount !== undefined ? Math.trunc(Number(req.body.amount)) : row.amount;
  if (!Number.isFinite(amount) || amount === 0)
    return res.status(400).json({ error: '0이 아닌 포인트를 입력하세요.' });
  const memo = req.body.memo !== undefined ? req.body.memo.toString().slice(0, 200) : row.memo;

  await prepare('UPDATE point_transactions SET amount=?, memo=? WHERE id=?').run(amount, memo, id);
  res.json(await prepare('SELECT * FROM point_transactions WHERE id=?').get(id));
});

// 적립 내역 삭제
router.delete('/points/tx/:id', ...adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const row = await prepare('SELECT id FROM point_transactions WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: '내역을 찾을 수 없습니다.' });
  await prepare('DELETE FROM point_transactions WHERE id=?').run(id);
  res.json({ ok: true });
});

module.exports = router;
