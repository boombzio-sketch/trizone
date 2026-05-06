import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, formatScore } from '../utils/helpers'

const PERIODS = [
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
  { key: 'yearly', label: '연간' },
]
const SPORTS = [
  { key: 'all', label: '종합' },
  { key: 'swim', label: '🏊 수영' },
  { key: 'bike', label: '🚴 사이클' },
  { key: 'run', label: '🏃 런' },
]

export default function RankingPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('weekly')
  const [sport, setSport] = useState('all')
  const [data, setData] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getRanking(period, sport),
      api.getDashboard(),
    ]).then(([r, d]) => {
      setData(r)
      setDashboard(d)
    }).finally(() => setLoading(false))
  }, [period, sport])

  const rankings = data?.rankings || []
  const myRank = rankings.findIndex(r => r.user_id === user?.id) + 1

  function getMainValue(row) {
    if (sport === 'swim') return `${(row.swim_km||0).toFixed(1)}km`
    if (sport === 'bike') return `${(row.bike_km||0).toFixed(1)}km`
    if (sport === 'run') return `${(row.run_km||0).toFixed(1)}km`
    return `${formatScore(row.total_score)}pt`
  }

  return (
    <div style={{ padding: '0 0 16px' }}>
      {/* 대시보드 */}
      {dashboard && (
        <div style={{ background: 'linear-gradient(135deg,#0C1420,#0A1828)', padding: '16px 16px 12px', borderBottom: '1px solid #16202E' }}>
          <div style={{ fontSize: 11, color: '#4DB8FF', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            이번 주 클럽 현황
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: '수영', val: `${(dashboard.totals?.swim_km||0).toFixed(1)}km`, color: '#4DB8FF' },
              { label: '사이클', val: `${(dashboard.totals?.bike_km||0).toFixed(1)}km`, color: '#00DC82' },
              { label: '런', val: `${(dashboard.totals?.run_km||0).toFixed(1)}km`, color: '#FFA000' },
            ].map(s => (
              <div key={s.label} style={{ background: '#101820', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#4A5A6A', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1, background: '#101820', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#6A7A8A' }}>활성 회원</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#E8E6E0' }}>{dashboard.totals?.active_members || 0}명</span>
            </div>
            <div style={{ flex: 1, background: '#101820', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#6A7A8A' }}>오늘 훈련</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00DC82' }}>{dashboard.todayCount || 0}명</span>
            </div>
          </div>
        </div>
      )}

      {/* 기간 탭 */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 12px 0', background: '#0A1018' }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
            background: period === p.key ? '#1A2A3E' : '#101820',
            color: period === p.key ? '#4DB8FF' : '#3A4A5A',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>{p.label}</button>
        ))}
      </div>

      {/* 종목 필터 */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#0A1018', overflowX: 'auto', borderBottom: '1px solid #12192A' }}>
        {SPORTS.map(s => (
          <button key={s.key} onClick={() => setSport(s.key)} style={{
            padding: '5px 12px', border: 'none', borderRadius: 20, whiteSpace: 'nowrap',
            background: sport === s.key ? '#1A2A3E' : '#101820',
            color: sport === s.key ? '#4DB8FF' : '#3A4A5A',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>{s.label}</button>
        ))}
      </div>

      {/* 내 순위 배너 */}
      {myRank > 0 && (
        <div style={{
          margin: '12px 12px 0', background: 'rgba(77,184,255,0.06)',
          border: '1px solid rgba(77,184,255,0.2)', borderRadius: 10,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: '#4DB8FF', fontWeight: 800 }}>내 순위</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#E8E6E0' }}>{myRank}위</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0' }}>
            {getMainValue(rankings[myRank-1])}
          </span>
        </div>
      )}

      {/* 랭킹 리스트 */}
      <div style={{ marginTop: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#3A4A5A', fontSize: 14 }}>⏳ 로딩 중...</div>
        ) : rankings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#3A4A5A', fontSize: 14 }}>
            아직 훈련 기록이 없습니다.<br />첫 번째로 기록을 등록해보세요! 💪
          </div>
        ) : rankings.map((r, i) => {
          const isMe = r.user_id === user?.id
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
          return (
            <div key={r.user_id} style={{
              display: 'flex', alignItems: 'center', padding: '10px 14px',
              borderBottom: '1px solid #0E1520', gap: 10,
              background: isMe ? 'rgba(77,184,255,0.04)' : 'transparent',
            }}>
              {/* 순위 */}
              <div style={{ width: 28, textAlign: 'center', fontSize: medal ? 18 : 13, fontWeight: 800, color: medal ? undefined : '#3A4A5A', flexShrink: 0 }}>
                {medal || (i + 1)}
              </div>
              {/* 아바타 */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: r.avatar_color + '22', border: `2px solid ${r.avatar_color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: r.avatar_color,
              }}>
                {r.nickname?.charAt(0)}
              </div>
              {/* 이름 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? '#4DB8FF' : '#E8E6E0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {r.nickname}
                  {isMe && <span style={{ fontSize: 9, background: 'rgba(77,184,255,0.2)', color: '#4DB8FF', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>나</span>}
                </div>
                <div style={{ fontSize: 10, color: '#4A5A6A', marginTop: 1 }}>
                  {r.workout_count || 0}회 훈련
                </div>
              </div>
              {/* 점수/거리 */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#4DB8FF', fontVariantNumeric: 'tabular-nums' }}>
                  {getMainValue(r)}
                </div>
                {sport === 'all' && (
                  <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 1 }}>
                    🏊{(r.swim_km||0).toFixed(1)} 🚴{(r.bike_km||0).toFixed(1)} 🏃{(r.run_km||0).toFixed(1)}
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
