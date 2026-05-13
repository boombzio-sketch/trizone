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

// 비밀번호 재설정 코드 직접 요청 (로그인 화면에서)
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: '이메일을 입력하세요.' });

  let user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) user = await db.prepare('SELECT * FROM users WHERE nickname = ?').get(email.trim());
  if (!user) return res.status(400).json({ error: '등록되지 않은 이메일 또는 닉네임입니다.' });
  if (!user.email) return res.status(400).json({ error: '이메일이 등록되지 않은 계정입니다. 관리자에게 문의하세요.' });

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: '이메일 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(code, expires, user.id);

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
    res.json({ sent: true });
  } catch (e) {
    console.error('[resend error]', e.message);
    res.status(500).json({ error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도하세요.' });
  }
});

// 비밀번호 재설정 (관리자 발급 코드 사용)
router.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body;
  if (!email?.trim() || !code?.trim() || !password)
    return res.status(400).json({ error: '모든 항목을 입력하세요.' });
  if (password.length < 4)
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });

  let user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) user = await db.prepare('SELECT * FROM users WHERE nickname = ?').get(email.trim());
  if (!user) return res.status(400).json({ error: '이메일 또는 닉네임을 확인하세요.' });

  if (!user.reset_token || user.reset_token !== code.trim())
    return res.status(400).json({ error: '코드가 올바르지 않습니다.' });

  if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date())
    return res.status(400).json({ error: '만료된 코드입니다. 관리자에게 새 코드를 요청하세요.' });

  const hash = bcrypt.hashSync(password, 10);
  await db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(hash, user.id);

  res.json({ ok: true });
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
