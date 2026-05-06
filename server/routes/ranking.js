const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');
const db = { prepare };

function getDateRange(period) {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    mon.setHours(0,0,0,0);
    return { from: mon.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
  }
  if (period === 'monthly') {
    return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to: now.toISOString().slice(0,10) };
  }
  if (period === 'yearly') {
    return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0,10) };
  }
  return { from: '2000-01-01', to: now.toISOString().slice(0,10) };
}

// 랭킹 (승인된 기록만 집계)
router.get('/', authMiddleware, (req, res) => {
  const { period = 'weekly', sport = 'all' } = req.query;
  const { from, to } = getDateRange(period);

  let sportFilter = '';
  if (sport !== 'all') sportFilter = `AND w.sport_type = '${sport}'`;

  const rows = db.prepare(`
    SELECT u.id as user_id, u.nickname, u.avatar_color,
           SUM(w.score) as total_score,
           SUM(CASE WHEN w.sport_type='swim' OR w.sport_type='brick' THEN w.distance_km ELSE 0 END) as swim_km,
           SUM(CASE WHEN w.sport_type='bike' THEN w.distance_km ELSE 0 END) as bike_km,
           SUM(CASE WHEN w.sport_type='run' THEN w.distance_km ELSE 0 END) as run_km,
           SUM(w.distance_km) as total_km,
           COUNT(w.id) as workout_count
    FROM users u
    LEFT JOIN workout_logs w ON u.id = w.user_id
      AND w.logged_at BETWEEN ? AND ?
      AND w.status = 'approved'
      ${sportFilter}
    GROUP BY u.id
    ORDER BY total_score DESC, total_km DESC
  `).all(from, to);

  let result = rows;
  if (sport === 'swim') result = rows.sort((a,b) => b.swim_km - a.swim_km);
  else if (sport === 'bike') result = rows.sort((a,b) => b.bike_km - a.bike_km);
  else if (sport === 'run') result = rows.sort((a,b) => b.run_km - a.run_km);

  res.json({ period, sport, from, to, rankings: result });
});

// 클럽 대시보드 (승인된 기록만)
router.get('/dashboard', authMiddleware, (req, res) => {
  const { from, to } = getDateRange('weekly');

  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN sport_type='swim' THEN distance_km ELSE 0 END) as swim_km,
      SUM(CASE WHEN sport_type='bike' THEN distance_km ELSE 0 END) as bike_km,
      SUM(CASE WHEN sport_type='run' THEN distance_km ELSE 0 END) as run_km,
      COUNT(*) as total_sessions,
      COUNT(DISTINCT user_id) as active_members
    FROM workout_logs
    WHERE logged_at BETWEEN ? AND ? AND status = 'approved'
  `).get(from, to);

  const heatmap = db.prepare(`
    SELECT u.id as user_id, u.nickname, u.avatar_color,
           w.logged_at, SUM(w.score) as day_score
    FROM users u
    LEFT JOIN workout_logs w ON u.id = w.user_id
      AND w.logged_at BETWEEN ? AND ?
      AND w.status = 'approved'
    GROUP BY u.id, w.logged_at
    ORDER BY u.nickname, w.logged_at
  `).all(from, to);

  const today = new Date().toISOString().slice(0,10);
  const todayCount = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as cnt FROM workout_logs
    WHERE logged_at = ? AND status = 'approved'
  `).get(today);

  res.json({ totals, heatmap, todayCount: todayCount.cnt, from, to });
});

module.exports = router;
