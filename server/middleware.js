const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const token = header.replace('Bearer ', '');

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: '토큰이 만료되었습니다.' });
  }

  // 역할/권한이 변경된 직후에도 다음 요청부터 반영되도록 매 요청마다 최신값을 읽는다.
  try {
    const { rows } = await pool.query(
      'SELECT role, can_approve FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!rows[0]) return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    req.user = { ...decoded, role: rows[0].role, can_approve: !!rows[0].can_approve };
    next();
  } catch (e) {
    console.error('[authMiddleware] DB error:', e.message);
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// can_approve: 과거 '훈련 승인' 권한 → 현재는 기록 수정 권한으로 재활용 중.
function canApproveMiddleware(req, res, next) {
  if (req.user?.role === 'admin' || req.user?.can_approve) return next();
  return res.status(403).json({ error: '기록 수정 권한이 없습니다.' });
}

// 사용자별 분당 N회 제한 (in-memory). 비용이 드는 외부 API 호출 엔드포인트용.
function rateLimit({ windowMs = 60_000, max = 5 } = {}) {
  const hits = new Map(); // userId -> timestamps[]
  return (req, res, next) => {
    const key = req.user?.id;
    if (!key) return next();
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= max) {
      return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
    }
    timestamps.push(now);
    hits.set(key, timestamps);
    next();
  };
}

module.exports = { authMiddleware, adminMiddleware, canApproveMiddleware, rateLimit, SECRET };
