require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { initDb, pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// gzip 압축 — 피드 응답엔 base64 커버 이미지가 섞여 있어 무압축 시 수 MB.
// base64는 텍스트라 gzip으로 크게 줄어든다 (전송 시간 단축).
app.use(compression());

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://trizone-client.onrender.com',
  'https://www.trizone.co.kr',
  'capacitor://localhost',
  'ionic://localhost',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));

initDb().then(() => {
  app.use('/api/auth',    require('./routes/auth'));
  app.use('/api/workouts',require('./routes/workouts'));
  app.use('/api/ranking', require('./routes/ranking'));
  app.use('/api/club',    require('./routes/club'));
  app.use('/api/users',   require('./routes/users'));
  app.use('/api/social',  require('./routes/social'));
  app.use('/api/admin',   require('./routes/admin'));
  app.use('/api/races',   require('./routes/races'));
  app.use('/api/clubs',    require('./routes/clubs'));
  app.use('/api/notices',  require('./routes/notices'));
  // 핑 엔드포인트 — Render 서버 + Neon DB 양쪽 모두 워밍.
  // cron-job.org가 10분 간격으로 호출.
  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true, ts: Date.now() });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.use((err, req, res, _next) => {
    console.error('[server error]', err);
    res.status(500).json({ error: err.message || '서버 오류' });
  });

  app.listen(PORT, () => {
    console.log(`✅ TRIZONE 서버 실행 중 → http://localhost:${PORT}`);
  });
}).catch(err => { console.error('DB 초기화 실패:', err); process.exit(1); });
