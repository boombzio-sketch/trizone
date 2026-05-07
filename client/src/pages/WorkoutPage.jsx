import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration, parseDuration } from '../utils/helpers'
import { C } from '../utils/theme'

const SPORTS = ['swim', 'bike', 'run', 'brick']
const STATUS_LABEL = { pending: '승인대기', approved: '승인', rejected: '반려' }
const STATUS_COLOR = { pending: C.warn, approved: C.success, rejected: C.error }
const STATUS_BG    = { pending: C.warnBg, approved: C.successBg, rejected: C.errorBg }
const VIS_OPTIONS = [
  { key: 'public',    label: '전체',   icon: '🌍', color: C.success },
  { key: 'club',      label: '클럽원', icon: '👥', color: C.accent },
  { key: 'followers', label: '팔로워', icon: '👤', color: C.brick },
  { key: 'private',   label: '비공개', icon: '🔒', color: C.text2 },
]
const VIS_MAP = {
  ...Object.fromEntries(VIS_OPTIONS.map(v => [v.key, v])),
  club_followers: { key: 'club_followers', label: '클럽+팔로워', icon: '👥', color: C.accent },
}

function toggleVis(current, key) {
  if (key === 'public' || key === 'private') return key
  const hasClu = current === 'club' || current === 'club_followers'
  const hasFol = current === 'followers' || current === 'club_followers'
  if (key === 'club') {
    const next = !hasClu
    return next && hasFol ? 'club_followers' : next ? 'club' : hasFol ? 'followers' : 'public'
  }
  const next = !hasFol
  return hasClu && next ? 'club_followers' : next ? 'followers' : hasClu ? 'club' : 'public'
}

async function compressImage(file, maxW = 1024, quality = 0.78) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

export default function WorkoutPage() {
  const [tab, setTab] = useState('log')
  const [sport, setSport] = useState('swim')
  const [form, setForm] = useState({ date: today(), distance: '', time: '', memo: '', pool_type: 'open', course_type: '실외', elevation: '', power: '' })
  const [brick, setBrick] = useState([
    { sport: 'swim', distance: '', time: '' },
    { sport: 'bike', distance: '', time: '' },
    { sport: 'run',  distance: '', time: '' },
  ])
  const [t1Time, setT1Time] = useState('')
  const [t2Time, setT2Time] = useState('')
  const [photos, setPhotos] = useState([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [visibility, setVisibility] = useState('public')
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

  async function handlePhotoAdd(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const remaining = 5 - photos.length
    const toProcess = files.slice(0, remaining)
    const base64s = await Promise.all(toProcess.map(f => compressImage(f)))
    setPhotos(prev => [...prev, ...base64s])
    e.target.value = ''
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setCoverIndex(prev => {
      if (prev === index) return 0
      if (prev > index) return prev - 1
      return prev
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const dur = parseDuration(form.time)
      const dist = parseFloat(form.distance) || 0
      let body = { sport_type: sport, logged_at: form.date, distance_km: dist, duration_sec: dur, memo: form.memo, photos, cover_photo_index: coverIndex, visibility }
      if (sport === 'swim') body.pool_type = form.pool_type
      else if (sport === 'bike') { body.course_type = form.course_type; body.elevation_m = parseInt(form.elevation)||0; body.avg_power_w = parseInt(form.power)||0 }
      else if (sport === 'run') { body.course_type = form.course_type }
      else if (sport === 'brick') {
        const segments = brick.map(b => ({ sport: b.sport, distance_km: parseFloat(b.distance)||0, duration_sec: parseDuration(b.time) }))
        body.brick_segments = segments
        body.distance_km = segments.reduce((s,b) => s+b.distance_km, 0)
        body.duration_sec = segments.reduce((s,b) => s+b.duration_sec, 0) + parseDuration(t1Time) + parseDuration(t2Time)
      }
      await api.addWorkout(body)
      setSuccess('✅ 기록이 저장되었습니다! 클럽장 승인 후 클럽 기록에 반영됩니다.')
      setForm({ date: today(), distance: '', time: '', memo: '', pool_type: 'open', course_type: 'road', elevation: '', power: '' })
      setBrick([{ sport: 'swim', distance: '', time: '' }, { sport: 'bike', distance: '', time: '' }, { sport: 'run', distance: '', time: '' }])
      setT1Time(''); setT2Time(''); setPhotos([]); setCoverIndex(0); setVisibility('public')
      setForm(f => ({ ...f, course_type: '실외' }))
      setTimeout(() => { setSuccess(''); setTab('log') }, 2000)
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('이 기록을 삭제할까요?')) return
    await api.deleteWorkout(id); loadLogs()
  }

  const [editingLog, setEditingLog] = useState(null)

  async function handleEditSave(id, body) {
    await api.editWorkout(id, body)
    setEditingLog(null)
    loadLogs()
  }

  const sc = SPORT_COLOR[sport]

  return (
    <div>
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

      {editingLog && <LogEditModal log={editingLog} onSave={handleEditSave} onClose={() => setEditingLog(null)} />}

      {tab === 'log' ? (
        <div>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: C.text2, fontSize: 14 }}>
              아직 훈련 기록이 없습니다.<br />"기록 추가" 탭에서 첫 훈련을 입력해보세요!
            </div>
          ) : logs.map(log => <LogItem key={log.id} log={log} onDelete={handleDelete} onEdit={setEditingLog} />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          {/* 종목 선택 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
            {SPORTS.map(s => (
              <button key={s} type="button" onClick={() => setSport(s)} style={{
                padding: '12px 4px', border: 'none', borderRadius: 14,
                background: sport===s ? SPORT_COLOR[s]+'18' : C.surfaceAlt,
                outline: sport===s ? `2px solid ${SPORT_COLOR[s]}` : '2px solid transparent',
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
            <Field label="⏱️ 시간 (HH:MM:SS)">
              <input placeholder="예: 1:02:18" value={form.time} onChange={e => setForm({...form, time: e.target.value})} style={inputSt(sc)} />
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
                  {[['실외','실외'],['실내','실내']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm({...form, course_type:v})} style={chipSt(form.course_type===v, sc)}>{l}</button>
                  ))}
                </div>
              </Field>
            </>)}
            {sport === 'run' && (
              <Field label="🛣️ 코스 유형">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['실외','실외'],['실내','실내']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm({...form, course_type:v})} style={chipSt(form.course_type===v, sc)}>{l}</button>
                  ))}
                </div>
              </Field>
            )}
          </>) : (
            <>
              {[
                { sport: 'swim', label: '수영', idx: 0 },
                { sport: 'bike', label: '사이클', idx: 1 },
                { sport: 'run',  label: '런', idx: 2 },
              ].map(({ sport: sp, label, idx }) => (
                <div key={sp}>
                  <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 6, borderLeft: `3px solid ${SPORT_COLOR[sp]}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{SPORT_ICON[sp]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: SPORT_COLOR[sp] }}>세그먼트 {idx+1} — {label}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input type="number" step="0.01" placeholder="거리 km" value={brick[idx].distance}
                        onChange={e => { const b=[...brick]; b[idx]={...b[idx],distance:e.target.value}; setBrick(b) }}
                        style={inputSt(SPORT_COLOR[sp])} />
                      <input placeholder="HH:MM:SS" value={brick[idx].time}
                        onChange={e => { const b=[...brick]; b[idx]={...b[idx],time:e.target.value}; setBrick(b) }}
                        style={inputSt(SPORT_COLOR[sp])} />
                    </div>
                  </div>
                  {idx < 2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 6px', padding: '0 4px' }}>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.warn }}>T{idx+1} 전환</span>
                      <input placeholder="HH:MM:SS" value={idx === 0 ? t1Time : t2Time}
                        onChange={e => idx === 0 ? setT1Time(e.target.value) : setT2Time(e.target.value)}
                        style={{ width: 80, padding: '6px 10px', background: C.surfaceAlt, border: `1px solid ${C.warn}44`, borderRadius: 8, color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit', textAlign: 'center' }} />
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          <Field label="📝 메모 (선택)">
            <textarea placeholder="오늘 훈련 소감을 적어보세요" value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} rows={2} style={{ ...inputSt(sc), resize: 'none' }} />
          </Field>

          {/* 공개 범위 */}
          <Field label="🔒 공개 범위">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {VIS_OPTIONS.map(v => {
                const active = v.key === 'club'
                  ? visibility === 'club' || visibility === 'club_followers'
                  : v.key === 'followers'
                  ? visibility === 'followers' || visibility === 'club_followers'
                  : visibility === v.key
                return (
                  <button key={v.key} type="button" onClick={() => setVisibility(toggleVis(visibility, v.key))} style={{
                    padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                    background: active ? v.color + '20' : C.surfaceAlt,
                    outline: active ? `2px solid ${v.color}` : '2px solid transparent',
                    color: active ? v.color : C.text2,
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{ fontSize: 18 }}>{v.icon}</span>{v.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* 사진 업로드 */}
          <Field label={`📷 사진 (${photos.length}/5) — 대표 사진을 선택하세요`}>
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    <img src={p} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, display: 'block', outline: i === coverIndex ? `3px solid ${C.accent}` : 'none' }} />
                    {i === coverIndex ? (
                      <div style={{ position: 'absolute', top: 4, left: 4, background: C.accent, borderRadius: 4, fontSize: 9, fontWeight: 800, color: '#fff', padding: '1px 5px' }}>대표</div>
                    ) : (
                      <button type="button" onClick={() => setCoverIndex(i)} style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 9, padding: '2px 5px', fontWeight: 700 }}>대표</button>
                    )}
                    <button type="button" onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 5 && (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: C.surfaceAlt, border: `1px dashed ${C.borderLight}`, borderRadius: 12, cursor: 'pointer', color: C.text2, fontSize: 13, fontWeight: 600 }}>
                📷 사진 추가 ({photos.length}/5)
                <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{ display: 'none' }} />
              </label>
            )}
          </Field>

          {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.error }}>{error}</div>}
          {success && <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: C.success, fontWeight: 600, lineHeight: 1.5 }}>{success}</div>}

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

function LogItem({ log, onDelete, onEdit }) {
  const sc = SPORT_COLOR[log.sport_type] || C.text2
  const segs = log.sport_type === 'brick' ? JSON.parse(log.brick_segments || '[]') : null
  const status = log.status || 'approved'
  const vis = VIS_MAP[log.visibility || 'public']
  return (
    <div style={{ margin: '8px 12px', background: C.surface, borderRadius: 14, overflow: 'hidden', borderLeft: `4px solid ${sc}` }}>
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: sc+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
          {SPORT_ICON[log.sport_type]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>{SPORT_LABEL[log.sport_type]}</span>
            <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 6px', background: STATUS_BG[status], color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
            <span style={{ fontSize: 9, color: vis.color }}>{vis.icon}</span>
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
          <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{log.score?.toFixed(2)}km</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onEdit(log)} style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 700 }}>수정</button>
            <button onClick={() => onDelete(log.id)} style={{ fontSize: 11, color: C.text3, background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
          </div>
        </div>
      </div>
      {log.photo && (
        <img src={log.photo} alt="훈련 사진" style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }} />
      )}
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

function secsToDur(sec) {
  const s = sec || 0
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
function durToSecs(d) { return (Number(d.h)||0)*3600 + (Number(d.m)||0)*60 + (Number(d.s)||0) }

function LogEditModal({ log, onSave, onClose }) {
  const isBrick = log.sport_type === 'brick'
  const initSegs = isBrick ? (() => { try { return JSON.parse(log.brick_segments||'[]') } catch { return [] } })() : null

  const [date, setDate]           = useState(log.logged_at?.slice(0,10) || '')
  const [distKm, setDistKm]       = useState(log.distance_km || 0)
  const [dur, setDur]             = useState(secsToDur(log.duration_sec))
  const [poolType, setPoolType]   = useState(log.pool_type || 'open')
  const [courseType, setCourseType] = useState(log.course_type || '실외')
  const [elevM, setElevM]         = useState(log.elevation_m || 0)
  const [avgPow, setAvgPow]       = useState(log.avg_power_w || 0)
  const [memo, setMemo]           = useState(log.memo || '')
  const [visibility, setVisibility] = useState(log.visibility || 'public')
  const [segs, setSegs]           = useState(initSegs ? initSegs.map(s => ({ ...s, dur: secsToDur(s.duration_sec) })) : null)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const iSt = { width: '100%', padding: '9px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
  const lSt = { display: 'block', fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
  const sc  = SPORT_COLOR[log.sport_type] || C.accent

  function DurInput({ value, onChange }) {
    const dSt = { width: 44, padding: '9px 4px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <input type="number" min={0} value={value.h} onChange={e => onChange({...value, h: e.target.value})} style={dSt} placeholder="h" />
        <span style={{ color: C.text2, fontSize: 13 }}>:</span>
        <input type="number" min={0} max={59} value={value.m} onChange={e => onChange({...value, m: e.target.value})} style={dSt} placeholder="m" />
        <span style={{ color: C.text2, fontSize: 13 }}>:</span>
        <input type="number" min={0} max={59} value={value.s} onChange={e => onChange({...value, s: e.target.value})} style={dSt} placeholder="s" />
      </div>
    )
  }

  function Toggle({ options, value, onChange }) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(o => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: value === o.v ? sc+'22' : C.surfaceAlt,
            color: value === o.v ? sc : C.text2,
            outline: value === o.v ? `2px solid ${sc}` : '2px solid transparent',
          }}>{o.l}</button>
        ))}
      </div>
    )
  }

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      const body = { memo, visibility, logged_at: date }
      if (isBrick && segs) {
        body.brick_segments = segs.map(s => ({ sport: s.sport, distance_km: Number(s.distance_km), duration_sec: durToSecs(s.dur) }))
      } else {
        body.distance_km  = Number(distKm)
        body.duration_sec = durToSecs(dur)
        if (log.sport_type === 'swim') body.pool_type = poolType
        if (log.sport_type === 'bike') { body.course_type = courseType; body.elevation_m = Number(elevM); body.avg_power_w = Number(avgPow) }
        if (log.sport_type === 'run')  { body.elevation_m = Number(elevM); body.course_type = courseType }
      }
      await onSave(log.id, body)
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', padding: 20, border: `1px solid ${C.border}`, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: sc, marginBottom: 16 }}>
          {SPORT_ICON[log.sport_type]} {SPORT_LABEL[log.sport_type]} 기록 수정
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lSt}>날짜</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iSt} />
        </div>

        {isBrick && segs ? segs.map((s, i) => (
          <div key={i} style={{ background: C.surfaceAlt, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SPORT_COLOR[s.sport]||C.accent, marginBottom: 8 }}>
              {SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={lSt}>거리 (km)</label>
                <input type="number" min={0} step={0.01} value={s.distance_km}
                  onChange={e => setSegs(prev => prev.map((x,j) => j===i ? {...x, distance_km: e.target.value} : x))}
                  style={iSt} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lSt}>시간</label>
                <DurInput value={s.dur} onChange={v => setSegs(prev => prev.map((x,j) => j===i ? {...x, dur: v} : x))} />
              </div>
            </div>
          </div>
        )) : (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lSt}>거리 (km)</label>
              <input type="number" min={0} step={0.01} value={distKm} onChange={e => setDistKm(e.target.value)} style={iSt} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lSt}>시간 (h:m:s)</label>
              <DurInput value={dur} onChange={setDur} />
            </div>
          </div>
        )}

        {log.sport_type === 'swim' && (
          <div style={{ marginBottom: 12 }}>
            <label style={lSt}>수영장 종류</label>
            <Toggle options={[{v:'open',l:'오픈워터'},{v:'indoor',l:'실내'}]} value={poolType} onChange={setPoolType} />
          </div>
        )}

        {log.sport_type === 'bike' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={lSt}>코스 종류</label>
              <Toggle options={[{v:'실외',l:'실외'},{v:'실내',l:'실내'}]} value={courseType} onChange={setCourseType} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={lSt}>획득 고도 (m)</label>
                <input type="number" min={0} value={elevM} onChange={e => setElevM(e.target.value)} style={iSt} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lSt}>평균 파워 (W)</label>
                <input type="number" min={0} value={avgPow} onChange={e => setAvgPow(e.target.value)} style={iSt} />
              </div>
            </div>
          </>
        )}

        {log.sport_type === 'run' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={lSt}>코스 종류</label>
              <Toggle options={[{v:'실외',l:'실외'},{v:'실내',l:'실내'}]} value={courseType} onChange={setCourseType} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lSt}>획득 고도 (m)</label>
              <input type="number" min={0} value={elevM} onChange={e => setElevM(e.target.value)} style={iSt} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={lSt}>메모</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} style={{ ...iSt, resize: 'none' }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={lSt}>공개 범위</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {VIS_OPTIONS.map(v => {
              const active = v.key==='club' ? visibility==='club'||visibility==='club_followers'
                           : v.key==='followers' ? visibility==='followers'||visibility==='club_followers'
                           : visibility===v.key
              return (
                <button key={v.key} type="button" onClick={() => setVisibility(toggleVis(visibility, v.key))} style={{
                  padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                  background: active ? v.color+'20' : C.surfaceAlt,
                  outline: active ? `2px solid ${v.color}` : '2px solid transparent',
                  color: active ? v.color : C.text2,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 18 }}>{v.icon}</span>{v.label}
                </button>
              )
            })}
          </div>
        </div>

        {err && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.error }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? C.surfaceHigh : sc, border: 'none', borderRadius: 12, color: saving ? C.text2 : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function inputSt(color = C.accent) {
  return { width: '100%', padding: '12px 14px', background: C.surfaceAlt, border: `1px solid ${color}44`, borderRadius: 12, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
}
function chipSt(active, color, small = false) {
  return { padding: small ? '5px 9px' : '7px 14px', border: 'none', borderRadius: 100, cursor: 'pointer', background: active ? color+'18' : C.surfaceAlt, outline: active ? `1.5px solid ${color}` : '1.5px solid transparent', color: active ? color : C.text2, fontSize: small ? 14 : 12, fontWeight: 700 }
}
