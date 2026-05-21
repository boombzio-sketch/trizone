require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

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
  app.get('/api/health',  (req, res) => res.json({ ok: true }));

  app.use((err, req, res, _next) => {
    console.error('[server error]', err);
    res.status(500).json({ error: err.message || '서버 오류' });
  });

  app.listen(PORT, () => {
    console.log(`✅ TRIZONE 서버 실행 중 → http://localhost:${PORT}`);
  });
}).catch(err => { console.error('DB 초기화 실패:', err); process.exit(1); });
