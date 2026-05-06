const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware');

const REGIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];

function getClubFull(id) {
  return prepare(`
    SELECT c.*, u.nickname as leader_name, u.avatar_color as leader_color,
           (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id=c.id AND cm.status='approved') as member_count
    FROM clubs c LEFT JOIN users u ON c.leader_id=u.id WHERE c.id=?
  `).get(id);
}

// ── 클럽장 신청 ──────────────────────────────────────────────

router.get('/my-leader-app', authMiddleware, (req, res) => {
  const application = prepare('SELECT * FROM club_leader_applications WHERE user_id=?').get(req.user.id) || null;
  const club = prepare('SELECT * FROM clubs WHERE leader_id=?').get(req.user.id) || null;
  res.json({ application, club });
});

router.post('/my-leader-app', authMiddleware, (req, res) => {
  const { message } = req.body;
  const existing = prepare('SELECT * FROM club_leader_applications WHERE user_id=?').get(req.user.id);
  if (existing?.status === 'approved') return res.status(400).json({ error: '이미 클럽장으로 승인되었습니다.' });
  if (existing?.status === 'pending') return res.status(400).json({ error: '이미 신청 중입니다.' });
  if (existing) {
    prepare("UPDATE club_leader_applications SET status='pending', message=?, applied_at=CURRENT_TIMESTAMP WHERE user_id=?").run(message||'', req.user.id);
  } else {
    prepare("INSERT INTO club_leader_applications (user_id, status, message) VALUES (?,'pending',?)").run(req.user.id, message||'');
  }
  res.json({ ok: true });
});

// ── 내 클럽 목록 ─────────────────────────────────────────────

router.get('/mine', authMiddleware, (req, res) => {
  const rows = prepare(`
    SELECT c.*, u.nickname as leader_name, u.avatar_color as leader_color,
           (SELECT COUNT(*) FROM club_memberships cm2 WHERE cm2.club_id=c.id AND cm2.status='approved') as member_count
    FROM clubs c
    LEFT JOIN users u ON c.leader_id=u.id
    JOIN club_memberships cm ON cm.club_id=c.id AND cm.user_id=? AND cm.status='approved'
    ORDER BY c.region, c.name
  `).all(req.user.id);
  res.json(rows);
});

// ── 클럽 목록 / 생성 ─────────────────────────────────────────

router.get('/', authMiddleware, (req, res) => {
  const { region } = req.query;
  let q = `
    SELECT c.*, u.nickname as leader_name, u.avatar_color as leader_color,
           (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id=c.id AND cm.status='approved') as member_count
    FROM clubs c LEFT JOIN users u ON c.leader_id=u.id
  `;
  const params = [];
  if (region && region !== '전체') { q += ' WHERE c.region=?'; params.push(region); }
  q += ' ORDER BY c.region, c.name';
  res.json(prepare(q).all(...params));
});

router.post('/', authMiddleware, (req, res) => {
  const { name, description, region } = req.body;
  if (!name || !region) return res.status(400).json({ error: '클럽명과 지역은 필수입니다.' });
  if (!REGIONS.includes(region)) return res.status(400).json({ error: '유효하지 않은 지역입니다.' });

  if (req.user.role !== 'admin') {
    const app = prepare("SELECT * FROM club_leader_applications WHERE user_id=? AND status='approved'").get(req.user.id);
    if (!app) return res.status(403).json({ error: '클럽장 승인 후 클럽을 만들 수 있습니다.' });
    const existing = prepare('SELECT id FROM clubs WHERE leader_id=?').get(req.user.id);
    if (existing) return res.status(400).json({ error: '이미 운영 중인 클럽이 있습니다.' });
  }

  const result = prepare('INSERT INTO clubs (name, description, region, leader_id) VALUES (?,?,?,?)').run(name, description||'', region, req.user.id);
  const clubId = result.lastInsertRowid;
  prepare("INSERT OR IGNORE INTO club_memberships (club_id, user_id, status) VALUES (?, ?, 'approved')").run(clubId, req.user.id);
  res.json(getClubFull(clubId));
});

// ── 클럽 상세 / 수정 ─────────────────────────────────────────

router.get('/:id', authMiddleware, (req, res) => {
  const club = getClubFull(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  res.json(club);
});

router.put('/:id', authMiddleware, (req, res) => {
  const club = getClubFull(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  if (club.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const { name, description, region } = req.body;
  if (!name || !region) return res.status(400).json({ error: '클럽명과 지역은 필수입니다.' });
  prepare('UPDATE clubs SET name=?, description=?, region=? WHERE id=?').run(name, description||'', region, req.params.id);
  res.json(getClubFull(req.params.id));
});

// 클럽 삭제 (admin only)
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '관리자만 클럽을 삭제할 수 있습니다.' });
  const club = prepare('SELECT id FROM clubs WHERE id=?').get(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  prepare('DELETE FROM club_memberships WHERE club_id=?').run(req.params.id);
  prepare('DELETE FROM club_announcements WHERE club_id=?').run(req.params.id);
  prepare('DELETE FROM clubs WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── 멤버십 ───────────────────────────────────────────────────

router.get('/:id/membership', authMiddleware, (req, res) => {
  const m = prepare('SELECT * FROM club_memberships WHERE club_id=? AND user_id=?').get(Number(req.params.id), req.user.id);
  res.json(m || { status: null });
});

router.post('/:id/join', authMiddleware, (req, res) => {
  const clubId = Number(req.params.id);
  const { message } = req.body;
  if (!prepare('SELECT id FROM clubs WHERE id=?').get(clubId))
    return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });

  const existing = prepare('SELECT * FROM club_memberships WHERE club_id=? AND user_id=?').get(clubId, req.user.id);
  if (existing?.status === 'approved') return res.status(400).json({ error: '이미 가입된 클럽입니다.' });
  if (existing?.status === 'pending') return res.status(400).json({ error: '이미 신청 중입니다.' });

  if (existing) {
    prepare("UPDATE club_memberships SET status='pending', message=?, applied_at=CURRENT_TIMESTAMP WHERE club_id=? AND user_id=?").run(message||'', clubId, req.user.id);
  } else {
    prepare("INSERT INTO club_memberships (club_id, user_id, status, message) VALUES (?,?,'pending',?)").run(clubId, req.user.id, message||'');
  }
  res.json({ ok: true });
});

router.delete('/:id/leave', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (club?.leader_id === req.user.id) return res.status(400).json({ error: '클럽장은 탈퇴할 수 없습니다.' });
  prepare("UPDATE club_memberships SET status='left' WHERE club_id=? AND user_id=?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ── 회원 목록 / 승인 ─────────────────────────────────────────

router.get('/:id/members', authMiddleware, (req, res) => {
  const rows = prepare(`
    SELECT u.id, u.nickname, u.avatar_color, u.avatar_image, cm.applied_at,
           COUNT(w.id) as total_workouts,
           COALESCE(SUM(CASE WHEN w.status='approved' THEN w.distance_km ELSE 0 END), 0) as total_km
    FROM club_memberships cm
    JOIN users u ON cm.user_id=u.id
    LEFT JOIN workout_logs w ON w.user_id=u.id
    WHERE cm.club_id=? AND cm.status='approved'
    GROUP BY u.id ORDER BY u.nickname
  `).all(req.params.id);
  res.json(rows);
});

router.get('/:id/pending-members', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  if (club.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const rows = prepare(`
    SELECT cm.*, u.nickname, u.avatar_color FROM club_memberships cm
    JOIN users u ON cm.user_id=u.id
    WHERE cm.club_id=? AND cm.status='pending' ORDER BY cm.applied_at ASC
  `).all(req.params.id);
  res.json(rows);
});

router.put('/:id/members/:userId/status', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  if (club.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  prepare('UPDATE club_memberships SET status=? WHERE club_id=? AND user_id=?').run(status, req.params.id, req.params.userId);
  res.json({ ok: true });
});

// 클럽장 양도 (클럽장 or admin)
router.put('/:id/transfer-leader', authMiddleware, (req, res) => {
  const club = getClubFull(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  if (club.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });

  const { new_leader_id } = req.body;
  if (!new_leader_id) return res.status(400).json({ error: '새 클럽장을 선택해주세요.' });
  if (Number(new_leader_id) === club.leader_id)
    return res.status(400).json({ error: '현재 클럽장과 동일한 회원입니다.' });

  const isMember = prepare("SELECT id FROM club_memberships WHERE club_id=? AND user_id=? AND status='approved'").get(req.params.id, new_leader_id);
  if (!isMember) return res.status(400).json({ error: '해당 회원이 클럽 멤버가 아닙니다.' });

  // 새 클럽장의 leader application 승인 처리
  prepare("INSERT OR IGNORE INTO club_leader_applications (user_id, status) VALUES (?, 'approved')").run(new_leader_id);
  prepare("UPDATE club_leader_applications SET status='approved' WHERE user_id=?").run(new_leader_id);
  prepare('UPDATE clubs SET leader_id=? WHERE id=?').run(new_leader_id, req.params.id);
  res.json(getClubFull(req.params.id));
});

// ── 공지사항 ─────────────────────────────────────────────────

router.get('/:id/announcements', authMiddleware, (req, res) => {
  const rows = prepare(`
    SELECT a.*, u.nickname, u.avatar_color FROM club_announcements a
    JOIN users u ON a.user_id=u.id WHERE a.club_id=? ORDER BY a.created_at DESC LIMIT 30
  `).all(req.params.id);
  res.json(rows);
});

router.post('/:id/announcements', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  if (club.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const { title, body } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력하세요.' });
  const result = prepare('INSERT INTO club_announcements (club_id, user_id, title, body) VALUES (?,?,?,?)').run(req.params.id, req.user.id, title, body||'');
  const row = prepare('SELECT a.*, u.nickname, u.avatar_color FROM club_announcements a JOIN users u ON a.user_id=u.id WHERE a.id=?').get(result.lastInsertRowid);
  res.json(row);
});

router.delete('/:id/announcements/:annId', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (club?.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  prepare('DELETE FROM club_announcements WHERE id=? AND club_id=?').run(req.params.annId, req.params.id);
  res.json({ ok: true });
});

// ── 훈련 모집 ─────────────────────────────────────────────────

router.get('/:id/trainings', authMiddleware, (req, res) => {
  const rows = prepare(`
    SELECT t.*, u.nickname as creator_name,
           (SELECT COUNT(*) FROM club_training_participants WHERE training_id=t.id) as participant_count,
           (SELECT status FROM club_training_participants WHERE training_id=t.id AND user_id=?) as my_status
    FROM club_trainings t JOIN users u ON t.created_by=u.id
    WHERE t.club_id=? ORDER BY t.train_date DESC, t.train_time DESC
  `).all(req.user.id, req.params.id);
  res.json(rows);
});

router.post('/:id/trainings', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (!club) return res.status(404).json({ error: '클럽을 찾을 수 없습니다.' });
  if (club.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const { title, train_date, train_time, location, description, capacity, link_url } = req.body;
  if (!title || !train_date || !location) return res.status(400).json({ error: '훈련명, 날짜, 장소는 필수입니다.' });
  const result = prepare(`
    INSERT INTO club_trainings (club_id, title, train_date, train_time, location, description, capacity, link_url, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(req.params.id, title, train_date, train_time||'', location, description||'', capacity||0, link_url||'', req.user.id);
  const row = prepare(`
    SELECT t.*, u.nickname as creator_name,
           0 as participant_count, NULL as my_status
    FROM club_trainings t JOIN users u ON t.created_by=u.id WHERE t.id=?
  `).get(result.lastInsertRowid);
  res.json(row);
});

router.put('/:id/trainings/:tid', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (club?.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const { title, train_date, train_time, location, description, capacity, link_url } = req.body;
  prepare(`UPDATE club_trainings SET title=?, train_date=?, train_time=?, location=?, description=?, capacity=?, link_url=?
    WHERE id=? AND club_id=?`).run(title, train_date, train_time||'', location, description||'', capacity||0, link_url||'', req.params.tid, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id/trainings/:tid', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (club?.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  prepare('DELETE FROM club_training_participants WHERE training_id=?').run(req.params.tid);
  prepare('DELETE FROM club_trainings WHERE id=? AND club_id=?').run(req.params.tid, req.params.id);
  res.json({ ok: true });
});

// 참가 신청
router.post('/:id/trainings/:tid/join', authMiddleware, (req, res) => {
  prepare("INSERT OR IGNORE INTO club_training_participants (training_id, user_id, status) VALUES (?,?,'joined')").run(req.params.tid, req.user.id);
  res.json({ ok: true });
});

// 참가 취소
router.delete('/:id/trainings/:tid/leave', authMiddleware, (req, res) => {
  prepare('DELETE FROM club_training_participants WHERE training_id=? AND user_id=?').run(req.params.tid, req.user.id);
  res.json({ ok: true });
});

// 출석 체크 (leader/admin)
router.put('/:id/trainings/:tid/attendance/:userId', authMiddleware, (req, res) => {
  const club = prepare('SELECT leader_id FROM clubs WHERE id=?').get(req.params.id);
  if (club?.leader_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '권한이 없습니다.' });
  const { status } = req.body;
  if (!['joined','attended','absent'].includes(status)) return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  prepare('UPDATE club_training_participants SET status=? WHERE training_id=? AND user_id=?').run(status, req.params.tid, req.params.userId);
  res.json({ ok: true });
});

// 참가자 목록
router.get('/:id/trainings/:tid/participants', authMiddleware, (req, res) => {
  const rows = prepare(`
    SELECT p.*, u.nickname, u.avatar_color
    FROM club_training_participants p JOIN users u ON p.user_id=u.id
    WHERE p.training_id=? ORDER BY p.applied_at ASC
  `).all(req.params.tid);
  res.json(rows);
});

// 회원별 훈련 참가 횟수
router.get('/:id/training-stats', authMiddleware, (req, res) => {
  const rows = prepare(`
    SELECT p.user_id, COUNT(*) as total, SUM(CASE WHEN p.status='attended' THEN 1 ELSE 0 END) as attended
    FROM club_training_participants p
    JOIN club_trainings t ON p.training_id=t.id
    WHERE t.club_id=?
    GROUP BY p.user_id
  `).all(req.params.id);
  res.json(rows);
});

module.exports = router;
