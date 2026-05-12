const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prepare } = require('../db');
const { SECRET, authMiddleware } = require('../middleware');
const db = { prepare };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 회원가입
router.post('/register', async (req, res) => {
  const { email, nickname, password } = req.body;

  if (!email || !nickname || !password)
    return res.status(400).json({ error: '이메일, 닉네임, 비밀번호를 모두 입력하세요.' });
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
  if (password.length < 4)
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
  if (nickname.length < 2)
    return res.status(400).json({ error: '닉네임은 2자 이상이어야 합니다.' });

  const emailExists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (emailExists) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });

  const nickExists = await db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  if (nickExists) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  const colors = ['#4DB8FF','#00DC82','#FFA000','#CC64FF','#FF5080','#00BFFF','#FF8C42','#A8FF3E'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const hash = bcrypt.hashSync(password, 10);

  const userCount = await db.prepare('SELECT COUNT(*)::int as cnt FROM users').get();
  const finalRole = userCount.cnt === 0 ? 'admin' : 'member';

  const result = await db.prepare(
    'INSERT INTO users (email, nickname, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run(email.toLowerCase(), nickname, hash, finalRole, color);

  const user = { id: result.lastInsertRowid, email: email.toLowerCase(), nickname, role: finalRole, avatar_color: color };
  const token = jwt.sign(user, SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

// 로그인 (이메일 우선, 기존 닉네임 계정 하위 호환)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' });

  // 이메일로 조회, 없으면 닉네임으로 조회 (기존 계정 하위 호환)
  let user = null;
  try {
    user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  } catch {}
  if (!user) user = await db.prepare('SELECT * FROM users WHERE nickname = ?').get(email);
  if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  const payload = {
    id: user.id, email: user.email, nickname: user.nickname,
    role: user.role, avatar_color: user.avatar_color, can_approve: user.can_approve || false,
  };
  const token = jwt.sign(payload, SECRET, { expiresIn: '30d' });
  res.json({ token, user: payload });
});

// 내 정보
router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.prepare(
    'SELECT id, email, nickname, role, avatar_color, avatar_image, created_at, can_approve FROM users WHERE id = ?'
  ).get(req.user.id);
  const leaderOf = await db.prepare('SELECT COUNT(*)::int as cnt FROM clubs WHERE leader_id = ?').get(req.user.id);
  res.json({ ...user, is_club_leader: leaderOf.cnt > 0 });
});

module.exports = router;
