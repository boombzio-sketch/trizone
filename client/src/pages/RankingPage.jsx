import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, formatScore } from '../utils/helpers'
import { C } from '../utils/theme'

const PERIODS = [
  { key: 'weekly',  label: '주간' },
  { key: 'monthly', label: '월간' },
  { key: 'yearly',  label: '연간' },
  { key: 'custom',  label: '기간설정' },
]
const SPORTS = [{ key: 'swim', label: '🏊 수영' }, { key: 'bike', label: '🚴 사이클' }, { key: 'run', label: '🏃 런' }]

const today = new Date().toISOString().slice(0, 10)

export default function RankingPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('weekly')
  const [sport, setSport] = useState('swim')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [data, setData] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    const rankingParams = period === 'custom'
      ? api.getRankingCustom(customFrom, customTo, sport)
      : api.getRanking(period, sport)
    Promise.all([rankingParams, api.getDashboard()])
      .then(([r, d]) => { setData(r); setDashboard(d) })
      .finally(() => setLoading(false))
  }, [period, sport, customFrom, customTo])

  const rankings = data?.rankings || []
  const myRank = rankings.findIndex(r => r.user_id === user?.id) + 1

  function getMainValue(row) {
    if (sport === 'swim') return `${(row.swim_km||0).toFixed(1)}km`
    if (sport === 'bike') return `${(row.bike_km||0).toFixed(1)}km`
    if (sport === 'run')  return `${(row.run_km||0).toFixed(1)}km`
    return `${(row.total_km||0).toFixed(1)}km`
  }

  return (
    <div>
      {/* 클럽 대시보드 */}
      {dashboard && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 14px 14px' }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>이번 주 클럽 현황</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
            {[
              { label: '수영', val: (dashboard.totals?.swim_km||0).toFixed(1), unit: 'km', color: C.swim },
              { label: '사이클', val: (dashboard.totals?.bike_km||0).toFixed(1), unit: 'km', color: C.bike },
              { label: '런', val: (dashboard.totals?.run_km||0).toFixed(1), unit: 'km', color: C.run },
            ].map(s => (
              <div key={s.label} style={{ background: C.surfaceAlt, borderRadius: 14, padding: '12px 10px', borderLeft: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 10, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>{s.unit}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.text2 }}>활성 회원</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{dashboard.totals?.active_members || 0}명</span>
            </div>
            <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.text2 }}>오늘 훈련</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.success }}>{dashboard.todayCount || 0}명</span>
            </div>
          </div>
        </div>
      )}

      {/* 기간 필터 */}
      <div style={{ background: C.bg, padding: '12px 14px 0' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: 100,
              background: period === p.key ? C.accentBg : C.surfaceAlt,
              color: period === p.key ? C.accent : C.text2,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              outline: period === p.key ? `1px solid ${C.accentBorder}` : 'none',
            }}>{p.label}</button>
          ))}
        </div>

        {/* 날짜 범위 표시 */}
        {period !== 'custom' && data && (
          <div style={{ fontSize: 11, color: C.text2, marginTop: 8, textAlign: 'center' }}>
            📅 {data.from} ~ {data.to}
          </div>
        )}

        {/* 커스텀 날짜 선택 */}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <input type="date" value={customFrom} max={customTo || today}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <span style={{ color: C.text2, fontSize: 12, fontWeight: 700 }}>~</span>
            <input type="date" value={customTo} min={customFrom} max={today}
              onChange={e => setCustomTo(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        )}
      </div>

      {/* 종목 필터 */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 14px 12px', background: C.bg, overflowX: 'auto', borderBottom: `1px solid ${C.border}` }}>
        {SPORTS.map(s => (
          <button key={s.key} onClick={() => setSport(s.key)} style={{
            padding: '6px 14px', border: 'none', borderRadius: 100, whiteSpace: 'nowrap',
            background: sport === s.key ? C.accentBg : C.surfaceAlt,
            color: sport === s.key ? C.accent : C.text2,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            outline: sport === s.key ? `1px solid ${C.accentBorder}` : 'none',
          }}>{s.label}</button>
        ))}
      </div>

      {/* 내 순위 배너 */}
      {myRank > 0 && (
        <div style={{ margin: '12px 12px 0', background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: C.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>내 순위</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{myRank}위</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{getMainValue(rankings[myRank-1])}</span>
        </div>
      )}

      {/* 랭킹 리스트 */}
      <div style={{ marginTop: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.text2 }}>⏳ 로딩 중...</div>
        ) : rankings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.text2, fontSize: 14 }}>
            아직 훈련 기록이 없습니다.<br />첫 번째로 기록을 등록해보세요! 💪
          </div>
        ) : rankings.map((r, i) => {
          const isMe = r.user_id === user?.id
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
          return (
            <div key={r.user_id} style={{
              display: 'flex', alignItems: 'center', padding: '11px 14px',
              borderBottom: `1px solid ${C.border}`, gap: 12,
              background: isMe ? C.accentBg : 'transparent',
            }}>
              <div style={{ width: 28, textAlign: 'center', fontSize: medal ? 20 : 13, fontWeight: 800, color: C.text2, flexShrink: 0 }}>
                {medal || (i + 1)}
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: r.avatar_color+'22', border: `2px solid ${r.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: r.avatar_color }}>
                {r.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? C.accent : C.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {r.nickname}
                  {isMe && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>나</span>}
                </div>
                <div style={{ fontSize: 10, color: C.text2, marginTop: 1 }}>{r.workout_count || 0}회 훈련</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{getMainValue(r)}</div>
                {sport === 'all' && (
                  <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>
                    🏊{(r.swim_km||0).toFixed(1)}km 🚴{(r.bike_km||0).toFixed(1)}km 🏃{(r.run_km||0).toFixed(1)}km
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
