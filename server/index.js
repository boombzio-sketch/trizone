const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

initDb().then(() => {
  app.use('/api/auth',    require('./routes/auth'));
  app.use('/api/workouts',require('./routes/workouts'));
  app.use('/api/ranking', require('./routes/ranking'));
  app.use('/api/club',    require('./routes/club'));
  app.use('/api/users',   require('./routes/users'));
  app.use('/api/social',  require('./routes/social'));
  app.get('/api/health',  (req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`✅ TRIZONE 서버 실행 중 → http://localhost:${PORT}`);
  });
}).catch(err => { console.error('DB 초기화 실패:', err); process.exit(1); });
