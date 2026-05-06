const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prepare } = require('../db');
const { SECRET, authMiddleware } = require('../middleware');
const db = { prepare };

// 회원가입
router.post('/register', (req, res) => {
  const { nickname, password, role } = req.body;
  if (!nickname || !password) return res.status(400).json({ error: '닉네임과 비밀번호를 입력하세요.' });
  if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });

  const exists = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  if (exists) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  const colors = ['#4DB8FF','#00DC82','#FFA000','#CC64FF','#FF5080','#00BFFF','#FF8C42','#A8FF3E'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const hash = bcrypt.hashSync(password, 10);
  // 첫 번째 가입자는 자동으로 admin
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  const finalRole = userCount.cnt === 0 ? 'admin' : (role === 'admin' ? 'member' : 'member');

  const result = db.prepare(
    'INSERT INTO users (nickname, password_hash, role, avatar_color) VALUES (?, ?, ?, ?)'
  ).run(nickname, hash, finalRole, color);

  const user = { id: result.lastInsertRowid, nickname, role: finalRole, avatar_color: color };
  const token = jwt.sign(user, SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

// 로그인
router.post('/login', (req, res) => {
  const { nickname, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname);
  if (!user) return res.status(401).json({ error: '존재하지 않는 닉네임입니다.' });
  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });

  const payload = { id: user.id, nickname: user.nickname, role: user.role, avatar_color: user.avatar_color };
  const token = jwt.sign(payload, SECRET, { expiresIn: '30d' });
  res.json({ token, user: payload });
});

// 내 정보
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, nickname, role, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
