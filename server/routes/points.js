const router = require('express').Router();
const { prepare } = require('../db');
const { authMiddleware } = require('../middleware');
const { MONTHLY_CAP, getSettings, isPayoutActive } = require('../points');

// 내 포인트 요약 + 적립 내역
router.get('/me', authMiddleware, async (req, res) => {
  const uid = req.user.id;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const { balance } = await prepare(
    'SELECT COALESCE(SUM(amount),0) AS balance FROM point_transactions WHERE user_id=?'
  ).get(uid);

  const { accrued } = await prepare(
    `SELECT COALESCE(SUM(amount),0) AS accrued FROM point_transactions
     WHERE user_id=? AND type='auto' AND to_char(earned_date,'YYYY-MM')=?`
  ).get(uid, month);

  const transactions = await prepare(
    `SELECT id, amount, type, sport_type, earned_date, memo, created_at
     FROM point_transactions WHERE user_id=?
     ORDER BY created_at DESC LIMIT 100`
  ).all(uid);

  const settings = await getSettings();
  res.json({
    balance: balance || 0,
    month_accrued: accrued || 0,
    monthly_cap: MONTHLY_CAP,
    payout_active: isPayoutActive(settings, today),
    period_start: settings.period_start,
    period_end: settings.period_end,
    transactions,
  });
});

module.exports = router;
