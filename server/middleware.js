const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'trizone_secret_2025';

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

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, SECRET };
