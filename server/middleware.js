const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: '토큰이 만료되었습니다.' });
  }
}

async function adminMiddleware(req, res, next) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
  if (rows[0]?.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

async function canApproveMiddleware(req, res, next) {
  if (req.user?.role === 'admin') return next();
  const { rows } = await pool.query('SELECT can_approve FROM users WHERE id = $1', [req.user.id]);
  if (rows[0]?.can_approve) return next();
  return res.status(403).json({ error: '훈련 승인 권한이 없습니다.' });
}

module.exports = { authMiddleware, adminMiddleware, canApproveMiddleware, SECRET };
