const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');

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

// 브릭 세그먼트 포함, 종목별 거리 합산
function calcDistances(workouts) {
  const stats = {};
  for (const w of workouts) {
    if (!stats[w.user_id]) stats[w.user_id] = { swim: 0, bike: 0, run: 0, count: 0 };
    stats[w.user_id].count++;
    if (w.sport_type === 'brick') {
      try {
        const segs = JSON.parse(w.brick_segments || '[]');
        for (const seg of segs) {
          const km = seg.distance_km || 0;
          if (seg.sport === 'swim') stats[w.user_id].swim += km;
          else if (seg.sport === 'bike') stats[w.user_id].bike += km;
          else if (seg.sport === 'run')  stats[w.user_id].run  += km;
        }
      } catch {}
    } else {
      const km = w.distance_km || 0;
      if (w.sport_type === 'swim') stats[w.user_id].swim += km;
      else if (w.sport_type === 'bike') stats[w.user_id].bike += km;
      else if (w.sport_type === 'run')  stats[w.user_id].run  += km;
    }
  }
  return stats;
}

// 랭킹
router.get('/', authMiddleware, (req, res) => {
  const { period = 'weekly', sport = 'all' } = req.query;
  const { from, to } = getDateRange(period);

  const workouts = prepare(`
    SELECT user_id, sport_type, distance_km, brick_segments
    FROM workout_logs WHERE logged_at BETWEEN ? AND ? AND status = 'approved'
  `).all(from, to);

  const distStats = calcDistances(workouts);
  const users = prepare('SELECT id as user_id, nickname, avatar_color FROM users').all();

  let rankings = users.map(u => {
    const s = distStats[u.user_id] || { swim: 0, bike: 0, run: 0, count: 0 };
    return {
      user_id: u.user_id,
      nickname: u.nickname,
      avatar_color: u.avatar_color,
      swim_km: s.swim,
      bike_km: s.bike,
      run_km: s.run,
      total_km: s.swim + s.bike + s.run,
      workout_count: s.count,
    };
  });

  if (sport === 'swim')      rankings.sort((a,b) => b.swim_km - a.swim_km);
  else if (sport === 'bike') rankings.sort((a,b) => b.bike_km - a.bike_km);
  else if (sport === 'run')  rankings.sort((a,b) => b.run_km  - a.run_km);
  else                       rankings.sort((a,b) => b.total_km - a.total_km);

  res.json({ period, sport, from, to, rankings });
});

// 클럽 대시보드
router.get('/dashboard', authMiddleware, (req, res) => {
  const { from, to } = getDateRange('weekly');

  const workouts = prepare(`
    SELECT user_id, sport_type, distance_km, brick_segments
    FROM workout_logs WHERE logged_at BETWEEN ? AND ? AND status = 'approved'
  `).all(from, to);

  const distStats = calcDistances(workouts);

  let totalSwim = 0, totalBike = 0, totalRun = 0;
  const activeUsers = new Set();
  for (const [uid, s] of Object.entries(distStats)) {
    totalSwim += s.swim; totalBike += s.bike; totalRun += s.run;
    if (s.swim + s.bike + s.run > 0) activeUsers.add(uid);
  }

  const today = new Date().toISOString().slice(0,10);
  const todayCount = prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM workout_logs WHERE logged_at=? AND status='approved'").get(today);

  const heatmap = prepare(`
    SELECT u.id as user_id, u.nickname, u.avatar_color, w.logged_at,
           SUM(w.distance_km) as day_score
    FROM users u
    LEFT JOIN workout_logs w ON u.id=w.user_id
      AND w.logged_at BETWEEN ? AND ? AND w.status='approved'
    GROUP BY u.id, w.logged_at ORDER BY u.nickname, w.logged_at
  `).all(from, to);

  res.json({
    totals: { swim_km: totalSwim, bike_km: totalBike, run_km: totalRun, active_members: activeUsers.size },
    heatmap,
    todayCount: todayCount.cnt,
    from, to,
  });
});

module.exports = router;
