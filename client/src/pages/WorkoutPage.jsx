import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration, parseDuration } from '../utils/helpers'
import { C } from '../utils/theme'

const SPORTS = ['swim', 'bike', 'run', 'brick']

export default function WorkoutPage() {
  const [tab, setTab] = useState('log')
  const [sport, setSport] = useState('swim')
  const [form, setForm] = useState({ date: today(), distance: '', time: '', memo: '', pool_type: 'open', course_type: 'road', elevation: '', power: '' })
  const [brick, setBrick] = useState([{ sport: 'bike', distance: '', time: '' }, { sport: 'run', distance: '', time: '' }])
  const [transitTime, setTransitTime] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { if (tab === 'log') loadLogs() }, [tab])

  async function loadLogs() {
    const rows = await api.getWorkouts('limit=50')
    setLogs(rows)
  }

  function today() { return new Date().toISOString().slice(0,10) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const dur = parseDuration(form.time)
      const dist = parseFloat(form.distance) || 0
      let body = { sport_type: sport, logged_at: form.date, distance_km: dist, duration_sec: dur, memo: form.memo }
      if (sport === 'swim') body.pool_type = form.pool_type
      else if (sport === 'bike') {
        body.course_type = form.course_type
        body.elevation_m = parseInt(form.elevation) || 0
        body.avg_power_w = parseInt(form.power) || 0
      } else if (sport === 'brick') {
        const segments = brick.map(b => ({ sport: b.sport, distance_km: parseFloat(b.distance)||0, duration_sec: parseDuration(b.time) }))
        body.brick_segments = segments
        body.distance_km = segments.reduce((s,b) => s+b.distance_km, 0)
        body.duration_sec = segments.reduce((s,b) => s+b.duration_sec, 0) + parseDuration(transitTime)
      }
      await api.addWorkout(body)
      setSuccess('✅ 기록이 저장되었습니다!')
      setForm({ date: today(), distance: '', time: '', memo: '', pool_type: 'open', course_type: 'road', elevation: '', power: '' })
      setBrick([{ sport: 'bike', distance: '', time: '' }, { sport: 'run', distance: '', time: '' }])
      setTransitTime('')
      setTimeout(() => { setSuccess(''); setTab('log') }, 1200)
    } catch(err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('이 기록을 삭제할까요?')) return
    await api.deleteWorkout(id); loadLogs()
  }

  const sc = SPORT_COLOR[sport]

  return (
    <div>
      {/* 탭 */}
      <div style={{ display: 'flex', background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 14px' }}>
        {[['log','📋 기록 목록'],['add','➕ 기록 추가']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: '14px 0', border: 'none',
            borderBottom: tab===k ? `2px solid ${C.accent}` : '2px solid transparent',
            background: 'transparent', color: tab===k ? C.accent : C.text2,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'log' ? (
        <div>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: C.text2, fontSize: 14 }}>
              아직 훈련 기록이 없습니다.<br />"기록 추가" 탭에서 첫 훈련을 입력해보세요!
            </div>
          ) : logs.map(log => <LogItem key={log.id} log={log} onDelete={handleDelete} />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          {/* 종목 선택 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
            {SPORTS.map(s => (
              <button key={s} type="button" onClick={() => setSport(s)} style={{
                padding: '12px 4px', border: 'none', borderRadius: 14,
                background: sport===s ? SPORT_COLOR[s]+'18' : C.surfaceAlt,
                outline: sport===s ? `2px solid ${SPORT_COLOR[s]}` : `2px solid transparent`,
                color: sport===s ? SPORT_COLOR[s] : C.text2,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 22 }}>{SPORT_ICON[s]}</span>
                {SPORT_LABEL[s]}
              </button>
            ))}
          </div>

          <Field label="📅 날짜">
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputSt(sc)} />
          </Field>

          {sport !== 'brick' ? (<>
            <Field label="📏 거리 (km)">
              <input type="number" step="0.01" placeholder="예: 1.5" value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} style={inputSt(sc)} />
            </Field>
            <Field label="⏱️ 시간 (HH:MM:SS 또는 MM:SS)">
              <input placeholder="예: 1:02:18 또는 32:10" value={form.time} onChange={e => setForm({...form, time: e.target.value})} style={inputSt(sc)} />
            </Field>
            {sport === 'swim' && (
              <Field label="🌊 수영 환경">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['open','오픈워터'],['pool25','25m'],['pool50','50m']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm({...form, pool_type:v})} style={chipSt(form.pool_type===v, sc)}>{l}</button>
                  ))}
                </div>
              </Field>
            )}
            {sport === 'bike' && (<>
              <Field label="📈 누적 고도 (m)">
                <input type="number" placeholder="예: 850" value={form.elevation} onChange={e => setForm({...form, elevation: e.target.value})} style={inputSt(sc)} />
              </Field>
              <Field label="⚡ 평균 파워 (W)">
                <input type="number" placeholder="예: 210" value={form.power} onChange={e => setForm({...form, power: e.target.value})} style={inputSt(sc)} />
              </Field>
              <Field label="🛣️ 코스 유형">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['road','로드'],['indoor','실내'],['mtb','MTB']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm({...form, course_type:v})} style={chipSt(form.course_type===v, sc)}>{l}</button>
                  ))}
                </div>
              </Field>
            </>)}
          </>) : (
            <>
              {brick.map((seg, i) => (
                <div key={i} style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 10, borderLeft: `3px solid ${SPORT_COLOR[seg.sport]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>{SPORT_ICON[seg.sport]}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: SPORT_COLOR[seg.sport] }}>세그먼트 {i+1}</span>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                      {['swim','bike','run'].map(s => (
                        <button key={s} type="button" onClick={() => { const b=[...brick]; b[i]={...b[i],sport:s}; setBrick(b) }} style={chipSt(seg.sport===s, SPORT_COLOR[s], true)}>{SPORT_ICON[s]}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="number" step="0.01" placeholder="거리 km" value={seg.distance} onChange={e => { const b=[...brick]; b[i]={...b[i],distance:e.target.value}; setBrick(b) }} style={inputSt(SPORT_COLOR[seg.sport])} />
                    <input placeholder="시간 MM:SS" value={seg.time} onChange={e => { const b=[...brick]; b[i]={...b[i],time:e.target.value}; setBrick(b) }} style={inputSt(SPORT_COLOR[seg.sport])} />
                  </div>
                </div>
              ))}
              <Field label="⏱️ 전환 시간 T2 (MM:SS)">
                <input placeholder="예: 4:30" value={transitTime} onChange={e => setTransitTime(e.target.value)} style={inputSt(C.brick)} />
              </Field>
            </>
          )}

          <Field label="📝 메모 (선택)">
            <textarea placeholder="오늘 훈련 소감을 적어보세요" value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} rows={2} style={{ ...inputSt(sc), resize: 'none' }} />
          </Field>

          {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.error }}>{error}</div>}
          {success && <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.success, textAlign: 'center', fontWeight: 700 }}>{success}</div>}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 15, border: 'none', borderRadius: 14,
            background: loading ? C.surfaceHigh : sc,
            color: loading ? C.text2 : '#fff',
            fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
          }}>
            {loading ? '저장 중...' : `💾 ${SPORT_LABEL[sport]} 기록 저장`}
          </button>
        </form>
      )}
    </div>
  )
}

function LogItem({ log, onDelete }) {
  const sc = SPORT_COLOR[log.sport_type] || C.text2
  const segs = log.sport_type === 'brick' ? JSON.parse(log.brick_segments || '[]') : null
  return (
    <div style={{ margin: '8px 12px', background: C.surface, borderRadius: 14, overflow: 'hidden', borderLeft: `4px solid ${sc}` }}>
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: sc+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
          {SPORT_ICON[log.sport_type]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>{SPORT_LABEL[log.sport_type]}</span>
            <span style={{ fontSize: 11, color: C.text2 }}>{log.logged_at}</span>
          </div>
          {segs ? (
            <div style={{ fontSize: 11, color: C.text2 }}>
              {segs.map((s,i) => <span key={i}>{SPORT_ICON[s.sport]} {s.distance_km}km {formatDuration(s.duration_sec)}  </span>)}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.text2 }}>{log.distance_km}km · {formatDuration(log.duration_sec)}</div>
          )}
          {log.memo && <div style={{ fontSize: 11, color: C.text3, marginTop: 3, fontStyle:'italic' }}>{log.memo}</div>}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{log.score?.toFixed(1)}pt</span>
          <button onClick={() => onDelete(log.id)} style={{ fontSize: 11, color: C.text3, background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

function inputSt(color = C.accent) {
  return { width: '100%', padding: '12px 14px', background: C.surfaceAlt, border: `1px solid ${color}44`, borderRadius: 12, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
}
function chipSt(active, color, small = false) {
  return { padding: small ? '5px 9px' : '7px 14px', border: 'none', borderRadius: 100, cursor: 'pointer', background: active ? color+'18' : C.surfaceAlt, outline: active ? `1.5px solid ${color}` : '1.5px solid transparent', color: active ? color : C.text2, fontSize: small ? 14 : 12, fontWeight: 700 }
}
