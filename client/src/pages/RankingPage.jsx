import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, formatScore } from '../utils/helpers'
import { C, cardBase } from '../utils/theme'

const PERIODS = [
  { key: 'weekly',  label: '주간' },
  { key: 'monthly', label: '월간' },
  { key: 'yearly',  label: '연간' },
  { key: 'custom',  label: '기간설정' },
]
const SPORTS = [{ key: 'swim', label: '🏊 수영' }, { key: 'bike', label: '🚴 사이클' }, { key: 'run', label: '🏃 런' }]

const today = new Date().toISOString().slice(0, 10)

const SCOPES = [
  { key: 'following', label: '팔로잉' },
  { key: 'club',      label: '클럽' },
  { key: 'all',       label: '전체' },
]

export default function RankingPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState('club')
  const [period, setPeriod] = useState('weekly')
  const [sport, setSport] = useState('swim')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    const call = period === 'custom'
      ? api.getRankingCustom(customFrom, customTo, sport, scope)
      : api.getRanking(period, sport, scope)
    call.then(r => setData(r)).finally(() => setLoading(false))
  }, [period, sport, scope, customFrom, customTo])

  const rankings = data?.rankings || []
  const myRank = rankings.findIndex(r => r.user_id === user?.id) + 1
  const myData = rankings.find(r => r.user_id === user?.id) || null
  const myKm = myData
    ? (sport === 'swim' ? myData.swim_km : sport === 'bike' ? myData.bike_km : sport === 'run' ? myData.run_km : myData.total_km) || 0
    : 0

  function getMainValue(row) {
    if (sport === 'swim') return `${(row.swim_km||0).toFixed(1)}km`
    if (sport === 'bike') return `${(row.bike_km||0).toFixed(1)}km`
    if (sport === 'run')  return `${(row.run_km||0).toFixed(1)}km`
    return `${(row.total_km||0).toFixed(1)}km`
  }

  const periodLabel = PERIODS.find(p => p.key === period)?.label || ''

  return (
    <div>
      {/* 나의 기록 */}
      <div style={{ background: 'linear-gradient(180deg, #0C1E38 0%, #091320 100%)', borderBottom: `1px solid rgba(56,189,248,0.15)`, padding: '14px 14px 12px' }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          ⚡ 나의 기록 {data && <span style={{ color: C.text3, fontWeight: 600, letterSpacing: 0 }}>  {data.from} ~ {data.to}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
          {[
            { label: '수영', val: (myData?.swim_km||0).toFixed(2), color: C.swim },
            { label: '사이클', val: (myData?.bike_km||0).toFixed(2), color: C.bike },
            { label: '런', val: (myData?.run_km||0).toFixed(2), color: C.run },
          ].map(s => (
            <div key={s.label} style={{ background: `linear-gradient(135deg, ${s.color}14 0%, transparent 70%)`, border: `1px solid ${s.color}30`, borderRadius: 14, padding: '12px 10px', borderTop: `2px solid ${s.color}` }}>
              <div style={{ fontSize: 9, color: s.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: s.color, marginTop: 2, fontWeight: 600 }}>km</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: `linear-gradient(135deg, ${C.accent}10 0%, transparent 70%)`, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>총 거리</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{(myData?.total_km||0).toFixed(2)}<span style={{ fontSize: 10, marginLeft: 2 }}>km</span></span>
          </div>
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>훈련 횟수</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{myData?.workout_count || 0}<span style={{ fontSize: 10, marginLeft: 2 }}>회</span></span>
          </div>
        </div>
      </div>

      {/* 범위 탭 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex' }}>
        {SCOPES.map(s => (
          <button key={s.key} onClick={() => setScope(s.key)} style={{
            flex: 1, padding: '11px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            color: scope === s.key ? C.accent : C.text2,
            borderBottom: scope === s.key ? `2px solid ${C.accent}` : '2px solid transparent',
          }}>{s.label}</button>
        ))}
      </div>

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


        {/* 기간 날짜 표시 */}
        {data && period !== 'custom' && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 15, fontWeight: 700, color: C.text2, letterSpacing: '0.02em' }}>
            {data.from} ~ {data.to}
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
      {myRank > 0 && myKm > 0 && (
        <div style={{ margin: '12px 12px 0', background: `linear-gradient(135deg, ${C.accent}18 0%, transparent 70%)`, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 0 24px ${C.accent}18` }}>
          <div>
            <div style={{ fontSize: 9, color: C.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>내 순위</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.03em' }}>{myRank}<span style={{ fontSize: 14, color: C.text2, marginLeft: 2 }}>위</span></div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{SPORT_ICON[sport]} 거리</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{getMainValue(rankings[myRank-1])}</div>
          </div>
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
          const podium = [
            { bg: 'linear-gradient(135deg, #FBBF2420 0%, transparent 60%)', border: '#FBBF2440', rankColor: '#FBBF24', label: '🥇' },
            { bg: 'linear-gradient(135deg, #CBD5E120 0%, transparent 60%)', border: '#CBD5E140', rankColor: '#CBD5E1', label: '🥈' },
            { bg: 'linear-gradient(135deg, #FB923C20 0%, transparent 60%)', border: '#FB923C40', rankColor: '#FB923C', label: '🥉' },
          ][i]

          return (
            <div key={r.user_id} style={{
              display: 'flex', alignItems: 'center', padding: podium ? '14px 16px' : '11px 14px',
              borderBottom: `1px solid ${C.border}`, gap: 12,
              background: podium ? podium.bg : isMe ? `${C.accent}10` : 'transparent',
              borderLeft: podium ? `3px solid ${podium.border}` : isMe ? `3px solid ${C.accent}` : '3px solid transparent',
            }}>
              <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                {podium
                  ? <span style={{ fontSize: 22, lineHeight: 1 }}>{podium.label}</span>
                  : <span style={{ fontSize: 13, fontWeight: 800, color: isMe ? C.accent : C.text3, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                }
              </div>
              <div style={{ width: podium ? 42 : 36, height: podium ? 42 : 36, borderRadius: '50%', flexShrink: 0, background: r.avatar_color+'22', border: `2px solid ${r.avatar_color}${podium ? '' : '90'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: podium ? 15 : 13, fontWeight: 800, color: r.avatar_color, boxShadow: podium ? `0 0 12px ${r.avatar_color}40` : 'none' }}>
                {r.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: podium ? 14 : 13, fontWeight: podium ? 800 : 700, color: isMe ? C.accent : C.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {r.nickname}
                  {isMe && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>나</span>}
                </div>
                <div style={{ fontSize: 10, color: C.text2, marginTop: 1 }}>{r.workout_count || 0}회 훈련</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: podium ? 17 : 14, fontWeight: 900, color: podium ? podium.rankColor : isMe ? C.accent : C.text2, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{getMainValue(r)}</div>
                {sport === 'all' && (
                  <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
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
