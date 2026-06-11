const { prepare } = require('./db');

// 적립 규칙: 종목별 1일 1회 포인트
const SPORT_POINTS = { swim: 200, bike: 200, run: 200, brick: 800 };
// 월 자동적립 상한 (자동분만 적용, 관리자 수동 지급은 제외)
const MONTHLY_CAP = 10000;

async function getSettings() {
  const row = await prepare('SELECT auto_enabled, period_start, period_end FROM point_settings WHERE id=1').get();
  return row || { auto_enabled: true, period_start: null, period_end: null };
}

// 오늘(today: 'YYYY-MM-DD') 기준 자동지급 활성 여부.
// auto_enabled가 켜져 있고, 기간이 설정돼 있으면 오늘이 그 안에 있어야 한다 (null이면 무제한).
function isPayoutActive(settings, today) {
  if (!settings?.auto_enabled) return false;
  if (settings.period_start && today < settings.period_start) return false;
  if (settings.period_end && today > settings.period_end) return false;
  return true;
}

// 훈련 기록 1건에 대한 자동 적립. 적립한 포인트(0이면 미적립)를 반환.
// 적립 실패가 기록 저장을 막지 않도록 호출부에서 try/catch로 감싼다.
async function accrueForWorkout({ userId, sportType, loggedAt, workoutId }) {
  const base = SPORT_POINTS[sportType];
  if (!base) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const settings = await getSettings();
  if (!isPayoutActive(settings, today)) return 0;

  // 기록 날짜(loggedAt)는 'YYYY-MM-DD' 형태. 종목·날짜당 1회만.
  const day = String(loggedAt).slice(0, 10);
  const dup = await prepare(
    `SELECT 1 FROM point_transactions
     WHERE user_id=? AND type='auto' AND sport_type=? AND earned_date=?`
  ).get(userId, sportType, day);
  if (dup) return 0;

  // 월 상한: 기록 날짜의 달 기준 자동적립 합계
  const month = day.slice(0, 7); // YYYY-MM
  const { sum } = await prepare(
    `SELECT COALESCE(SUM(amount),0) AS sum FROM point_transactions
     WHERE user_id=? AND type='auto' AND to_char(earned_date,'YYYY-MM')=?`
  ).get(userId, month);
  const remaining = MONTHLY_CAP - (sum || 0);
  if (remaining <= 0) return 0;

  const award = Math.min(base, remaining);
  await prepare(
    `INSERT INTO point_transactions (user_id, amount, type, sport_type, earned_date, workout_id, memo)
     VALUES (?, ?, 'auto', ?, ?, ?, ?)`
  ).run(userId, award, sportType, day, workoutId || null, '훈련 기록 자동 적립');
  return award;
}

module.exports = { SPORT_POINTS, MONTHLY_CAP, getSettings, isPayoutActive, accrueForWorkout };
