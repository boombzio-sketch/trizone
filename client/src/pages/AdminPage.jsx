import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { Navigate } from 'react-router-dom'
import { C } from '../utils/theme'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'
import Avatar from '../components/Avatar.jsx'

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('pending')
  const [badges, setBadges] = useState({ pending: null, messages: null, memberships: null, leaderApps: null, members: null })

  const isAdmin     = user?.role === 'admin'
  const canApprove  = isAdmin || user?.can_approve

  if (!canApprove) return <Navigate to="/" replace />

  const setBadge = (key, count) => setBadges(prev => ({ ...prev, [key]: count }))

  const tabDefs = [
    { key: 'pending',  label: '훈련 승인', badge: badges.pending },
    { key: 'messages', label: '쪽지',      badge: badges.messages },
    ...(isAdmin ? [
      { key: 'memberships', label: '클럽 가입',  badge: badges.memberships },
      { key: 'leaderApps',  label: '클럽장 신청', badge: badges.leaderApps },
      { key: 'members',     label: '회원 관리',  badge: badges.members },
    ] : []),
  ]

  return (
    <div>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 16px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>⚙️ 관리</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabDefs.map(({ key, label, badge }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, position: 'relative',
              color: tab === key ? C.accent : C.text2,
              borderBottom: tab === key ? `2px solid ${C.accent}` : '2px solid transparent',
            }}>
              {label}
              {badge !== null && (
                typeof badge === 'object' ? (
                  <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8, background: badge.today > 0 ? '#ef4444' : C.surfaceHigh, color: badge.today > 0 ? '#fff' : C.text2, verticalAlign: 'middle' }}>
                    {badge.today}/{badge.total}
                  </span>
                ) : badge > 0 ? (
                  <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, padding: '2px 5px', borderRadius: 8, background: '#ef4444', color: '#fff', verticalAlign: 'middle' }}>{badge}</span>
                ) : null
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: tab === 'pending'  ? 'block' : 'none' }}><PendingTab  onBadge={c => setBadge('pending', c)} /></div>
      <div style={{ display: tab === 'messages' ? 'block' : 'none' }}><MessagesTab onBadge={c => setBadge('messages', c)} /></div>
      {isAdmin && <div style={{ display: tab === 'memberships' ? 'block' : 'none' }}><MembershipsTab onBadge={c => setBadge('memberships', c)} /></div>}
      {isAdmin && <div style={{ display: tab === 'leaderApps' ? 'block' : 'none' }}><LeaderAppsTab onBadge={c => setBadge('leaderApps', c)} /></div>}
      {isAdmin && <div style={{ display: tab === 'members' ? 'block' : 'none' }}><MembersTab user={user} onBadge={c => setBadge('members', c)} /></div>}
    </div>
  )
}

function secsToDur(sec) {
  const s = sec || 0
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
function durToSecs(d) { return (Number(d.h) || 0) * 3600 + (Number(d.m) || 0) * 60 + (Number(d.s) || 0) }

function DurInput({ value, onChange }) {
  const iSt = { width: 44, padding: '8px 6px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input type="number" min={0} value={value.h} onChange={e => onChange({ ...value, h: e.target.value })} style={iSt} placeholder="h" />
      <span style={{ color: C.text2 }}>:</span>
      <input type="number" min={0} max={59} value={value.m} onChange={e => onChange({ ...value, m: e.target.value })} style={iSt} placeholder="m" />
      <span style={{ color: C.text2 }}>:</span>
      <input type="number" min={0} max={59} value={value.s} onChange={e => onChange({ ...value, s: e.target.value })} style={iSt} placeholder="s" />
    </div>
  )
}

function WorkoutEditModal({ workout: w, onSave, onClose }) {
  const isBrick = w.sport_type === 'brick'
  const initSegs = isBrick ? (() => { try { return JSON.parse(w.brick_segments || '[]') } catch { return [] } })() : null

  const [date, setDate]             = useState(w.logged_at?.slice(0, 10) || '')
  const [distKm, setDistKm]         = useState(w.distance_km || 0)
  const [dur, setDur]               = useState(secsToDur(w.duration_sec))
  const [poolType, setPoolType]     = useState(w.pool_type || 'open')
  const [courseType, setCourseType] = useState(w.course_type || '실외')
  const [elevM, setElevM]           = useState(w.elevation_m || 0)
  const [avgPow, setAvgPow]         = useState(w.avg_power_w || 0)
  const [memo, setMemo]             = useState(w.memo || '')
  const [segs, setSegs]             = useState(initSegs ? initSegs.map(s => ({ ...s, dur: secsToDur(s.duration_sec) })) : null)
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')

  const iSt = { width: '100%', padding: '9px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
  const lSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }

  function Toggle({ options, value, onChange }) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(o => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: value === o.v ? C.accentBg : C.surfaceAlt,
            color: value === o.v ? C.accent : C.text2,
            outline: value === o.v ? `2px solid ${C.accentBorder}` : '2px solid transparent',
          }}>{o.l}</button>
        ))}
      </div>
    )
  }

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      const body = { memo, logged_at: date }
      if (isBrick && segs) {
        body.brick_segments = segs.map(s => ({ sport: s.sport, distance_km: Number(s.distance_km), duration_sec: durToSecs(s.dur) }))
      } else {
        body.distance_km  = Number(distKm)
        body.duration_sec = durToSecs(dur)
        if (w.sport_type === 'swim') body.pool_type = poolType
        if (w.sport_type === 'bike') { body.course_type = courseType; body.elevation_m = Number(elevM); body.avg_power_w = Number(avgPow) }
        if (w.sport_type === 'run')  { body.elevation_m = Number(elevM); body.course_type = courseType }
      }
      await onSave(w.id, body)
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', padding: 20, border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>
          {SPORT_ICON[w.sport_type]} {SPORT_LABEL[w.sport_type]} 기록 수정
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lSt}>날짜</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iSt} />
        </div>

        {isBrick && segs ? segs.map((s, i) => (
          <div key={i} style={{ background: C.surfaceAlt, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SPORT_COLOR[s.sport] || C.accent, marginBottom: 8 }}>
              {SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={lSt}>거리 (km)</label>
                <input type="number" min={0} step={0.01} value={s.distance_km}
                  onChange={e => setSegs(prev => prev.map((x, j) => j === i ? { ...x, distance_km: e.target.value } : x))}
                  style={iSt} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lSt}>시간 (h:m:s)</label>
                <DurInput value={s.dur} onChange={v => setSegs(prev => prev.map((x, j) => j === i ? { ...x, dur: v } : x))} />
              </div>
            </div>
          </div>
        )) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
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

        {w.sport_type === 'swim' && (
          <div style={{ marginBottom: 14 }}>
            <label style={lSt}>수영장 종류</label>
            <Toggle options={[{v:'open',l:'오픈워터'},{v:'indoor',l:'실내'}]} value={poolType} onChange={setPoolType} />
          </div>
        )}

        {w.sport_type === 'bike' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={lSt}>코스 종류</label>
              <Toggle options={[{v:'실외',l:'실외'},{v:'실내',l:'실내'}]} value={courseType} onChange={setCourseType} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
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

        {w.sport_type === 'run' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={lSt}>코스 종류</label>
              <Toggle options={[{v:'실외',l:'실외'},{v:'실내',l:'실내'}]} value={courseType} onChange={setCourseType} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lSt}>획득 고도 (m)</label>
              <input type="number" min={0} value={elevM} onChange={e => setElevM(e.target.value)} style={iSt} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={lSt}>메모</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
            style={{ ...iSt, resize: 'none' }} />
        </div>

        {err && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: C.error }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? C.surfaceHigh : C.accent, border: 'none', borderRadius: 12, color: saving ? C.text2 : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PendingTab({ onBadge }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoModal, setPhotoModal] = useState(null)
  const [editingWorkout, setEditingWorkout] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getPendingWorkouts()
      setItems(data)
      onBadge(data.length)
    } finally { setLoading(false) }
  }

  async function handle(id, status) {
    await api.setWorkoutStatus(id, status)
    setItems(prev => {
      const next = prev.filter(w => w.id !== id)
      onBadge(next.length)
      return next
    })
  }

  async function handleEdit(id, body) {
    const updated = await api.editAdminWorkout(id, body)
    setItems(prev => prev.map(w => w.id === id ? { ...w, ...updated } : w))
    setEditingWorkout(null)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>승인 대기 기록이 없습니다</div>
    </div>
  )

  return (
    <div>
      {/* 기록 수정 모달 */}
      {editingWorkout && (
        <WorkoutEditModal workout={editingWorkout} onSave={handleEdit} onClose={() => setEditingWorkout(null)} />
      )}

      {/* 사진 전체보기 모달 */}
      {photoModal && (
        <div onClick={() => setPhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={photoModal} alt="원본 사진" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setPhotoModal(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>
        승인 대기 {items.length}건
      </div>
      {items.map(w => {
        const sc = SPORT_COLOR[w.sport_type] || C.accent
        const segs = w.sport_type === 'brick' ? (() => { try { return JSON.parse(w.brick_segments||'[]') } catch { return [] } })() : null
        const photos = (() => { try { return JSON.parse(w.photos||'[]') } catch { return [] } })()
        const displayPhoto = photos.length > 0 ? photos[w.cover_photo_index||0] : w.photo || null
        const totalKm = segs ? segs.reduce((s,seg) => s+(seg.distance_km||0), 0) : (w.distance_km||0)

        return (
          <div key={w.id} style={{ margin: '8px 12px', background: C.surface, borderRadius: 16, overflow: 'hidden', borderLeft: `4px solid ${sc}` }}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: w.avatar_color+'22', border: `2px solid ${w.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: w.avatar_color, flexShrink: 0 }}>
                  {w.nickname?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{w.nickname}</div>
                  <div style={{ fontSize: 10, color: C.text2 }}>{w.logged_at} · {SPORT_ICON[w.sport_type]} {SPORT_LABEL[w.sport_type]}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{totalKm.toFixed(2)}km</div>
              </div>

              <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                {segs ? (
                  segs.map((s,i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text2, marginBottom: 3 }}>
                      <span>{SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}</span>
                      <span style={{ fontWeight: 700, color: C.text }}>{(s.distance_km||0).toFixed(2)}km · {formatDuration(s.duration_sec)}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
                    {(w.distance_km||0).toFixed(2)}km · {formatDuration(w.duration_sec)}
                  </div>
                )}
                {w.memo && <div style={{ fontSize: 11, color: C.text2, marginTop: 6, fontStyle: 'italic' }}>{w.memo}</div>}
              </div>

              {(photos.length > 0 || displayPhoto) && (
                <div style={{ marginBottom: 10 }}>
                  {/* 대표 사진 */}
                  {displayPhoto && (
                    <div style={{ position: 'relative', marginBottom: 6 }}>
                      <img src={displayPhoto} alt="대표 사진" onClick={() => setPhotoModal(displayPhoto)}
                        style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} />
                      <div style={{ position: 'absolute', top: 6, left: 6, background: C.accent, borderRadius: 5, fontSize: 9, fontWeight: 800, color: '#fff', padding: '2px 7px' }}>대표</div>
                    </div>
                  )}
                  {/* 나머지 사진 */}
                  {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {photos.map((p, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={p} alt={`사진 ${i+1}`} onClick={() => setPhotoModal(p)}
                            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, display: 'block', cursor: 'zoom-in', outline: i === (w.cover_photo_index||0) ? `2px solid ${C.accent}` : 'none' }} />
                          <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.55)', borderRadius: 4, fontSize: 8, color: '#fff', padding: '1px 4px' }}>{i+1}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handle(w.id, 'rejected')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700 }}>
                  ✕ 반려
                </button>
                <button onClick={() => setEditingWorkout(w)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 700 }}>
                  ✏️ 수정
                </button>
                <button onClick={() => handle(w.id, 'approved')} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.successBg, color: C.success, fontSize: 13, fontWeight: 700 }}>
                  ✓ 승인
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LeaderAppsTab({ onBadge }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getClubLeaderApps()
      .then(data => { setItems(data); onBadge(data.length) })
      .finally(() => setLoading(false))
  }, [])

  async function handle(userId, status) {
    await api.setClubLeaderAppStatus(userId, status)
    setItems(prev => {
      const next = prev.filter(m => m.user_id !== userId)
      onBadge(next.length)
      return next
    })
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳</div>

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>대기 중인 클럽장 신청이 없습니다</div>
    </div>
  )

  return (
    <div>
      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>클럽장 신청 대기 {items.length}건</div>
      {items.map(m => (
        <div key={m.user_id} style={{ margin: '8px 12px', background: C.surface, borderRadius: 16, padding: 14, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.message ? 10 : 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
              {m.nickname?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.nickname}</div>
              <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{m.applied_at?.slice(0,10)} 신청</div>
            </div>
          </div>
          {m.message && <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: C.text2, fontStyle: 'italic' }}>"{m.message}"</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handle(m.user_id, 'rejected')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700 }}>✕ 거절</button>
            <button onClick={() => handle(m.user_id, 'approved')} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.successBg, color: C.success, fontSize: 13, fontWeight: 700 }}>✓ 승인 (클럽장)</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function MembershipsTab({ onBadge }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getPendingMemberships()
      setItems(data)
      onBadge(data.length)
    } finally { setLoading(false) }
  }

  async function handle(userId, status) {
    await api.setMembershipStatus(userId, status)
    setItems(prev => {
      const next = prev.filter(m => m.user_id !== userId)
      onBadge(next.length)
      return next
    })
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>대기 중인 가입 신청이 없습니다</div>
    </div>
  )

  return (
    <div>
      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>가입 대기 {items.length}건</div>
      {items.map(m => (
        <div key={m.id} style={{ margin: '8px 12px', background: C.surface, borderRadius: 16, padding: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.message ? 10 : 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
              {m.nickname?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.nickname}</div>
              <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>신청일 {m.applied_at?.slice(0,10)}</div>
            </div>
          </div>
          {m.message && (
            <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: C.text2, fontStyle: 'italic' }}>
              "{m.message}"
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handle(m.user_id, 'rejected')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700 }}>
              ✕ 거절
            </button>
            <button onClick={() => handle(m.user_id, 'approved')} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.successBg, color: C.success, fontSize: 13, fontWeight: 700 }}>
              ✓ 승인
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const AVATAR_COLORS = ['#4F9CF9','#0EA5E9','#22C55E','#F97316','#A855F7','#EF4444','#F59E0B','#10B981','#EC4899','#14B8A6']

function MembersTab({ user: currentUser, onBadge }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({ nickname: '', avatar_color: '', password: '', avatar_image: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getAdminMembers()
      .then(data => {
        setMembers(data)
        const today = new Date().toISOString().slice(0, 10)
        const todayCount = data.filter(m => m.created_at?.slice(0, 10) === today).length
        onBadge({ today: todayCount, total: data.length })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function openEdit(m) {
    setEditingMember(m)
    setEditForm({ nickname: m.nickname, avatar_color: m.avatar_color, password: '', avatar_image: m.avatar_image || '' })
    setEditError('')
  }

  async function handleEditSave() {
    setEditSaving(true); setEditError('')
    try {
      const updated = await api.updateAdminMember(editingMember.id, editForm)
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...updated } : m))
      setEditingMember(null)
    } catch(e) { setEditError(e.message) }
    finally { setEditSaving(false) }
  }

  async function handleRoleToggle(member) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`${member.nickname}의 역할을 ${newRole === 'admin' ? '관리자' : '일반회원'}으로 변경할까요?`)) return
    try {
      await api.setAdminMemberRole(member.id, newRole)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    } catch (e) { alert(e.message) }
  }

  async function handleApproveToggle(member) {
    const next = !member.can_approve
    if (!confirm(`${member.nickname}의 훈련 승인 권한을 ${next ? '부여' : '회수'}할까요?`)) return
    try {
      await api.setApprovePermission(member.id, next)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, can_approve: next } : m))
    } catch (e) { alert(e.message) }
  }

  async function handleDelete(member) {
    if (!confirm(`${member.nickname} 회원을 삭제할까요?\n모든 데이터가 삭제됩니다.`)) return
    try {
      await api.deleteAdminMember(member.id)
      setMembers(prev => {
        const next = prev.filter(m => m.id !== member.id)
        const today = new Date().toISOString().slice(0, 10)
        onBadge({ today: next.filter(m => m.created_at?.slice(0, 10) === today).length, total: next.length })
        return next
      })
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
  if (error) return <div style={{ textAlign: 'center', padding: 48, color: C.error, fontSize: 13 }}>{error}</div>

  return (
    <div>
      {/* 회원 수정 모달 */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>회원 정보 수정</div>

            {/* 아바타 미리보기 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Avatar nickname={editForm.nickname} avatar_color={editForm.avatar_color} avatar_image={editForm.avatar_image} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>프로필 이미지</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ padding: '6px 12px', background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.accent }}>
                    📷 이미지 선택
                    <input type="file" accept="image/*" onChange={async e => {
                      const file = e.target.files[0]; if (!file) return
                      const img = new Image(), url = URL.createObjectURL(file)
                      img.onload = () => {
                        const s = 120, c = document.createElement('canvas')
                        c.width = s; c.height = s
                        const min = Math.min(img.width, img.height)
                        c.getContext('2d').drawImage(img, (img.width-min)/2, (img.height-min)/2, min, min, 0, 0, s, s)
                        URL.revokeObjectURL(url)
                        setEditForm(p => ({ ...p, avatar_image: c.toDataURL('image/jpeg', 0.85) }))
                      }
                      img.src = url; e.target.value = ''
                    }} style={{ display: 'none' }} />
                  </label>
                  {editForm.avatar_image && (
                    <button onClick={() => setEditForm(p => ({ ...p, avatar_image: '' }))}
                      style={{ padding: '6px 12px', background: C.errorBg, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.error }}>
                      이미지 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>닉네임</label>
              <input value={editForm.nickname} onChange={e => setEditForm(p => ({...p, nickname: e.target.value}))}
                style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>새 비밀번호 (변경 시만 입력)</label>
              <input type="password" value={editForm.password} onChange={e => setEditForm(p => ({...p, password: e.target.value}))}
                placeholder="4자 이상, 입력 안 하면 유지"
                style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelSt}>아바타 색상</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATAR_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setEditForm(p => ({...p, avatar_color: color}))} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: color,
                    outline: editForm.avatar_color === color ? `3px solid ${C.text}` : '3px solid transparent',
                    outlineOffset: 2,
                  }} />
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: editForm.avatar_color+'22', border: `2px solid ${editForm.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: editForm.avatar_color }}>
                  {editForm.nickname?.charAt(0)}
                </div>
                <span style={{ fontSize: 12, color: C.text2 }}>미리보기</span>
              </div>
            </div>

            {editError && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: C.error }}>{editError}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditingMember(null)} style={{ flex: 1, padding: '11px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ flex: 2, padding: '11px', background: editSaving ? C.surfaceHigh : C.accent, border: 'none', borderRadius: 12, color: editSaving ? C.text2 : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {editSaving ? '저장 중...' : '💾 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>총 {members.length}명</div>
      {members.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: `1px solid ${C.border}` }}>
          <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.nickname}</span>
              {m.id === currentUser?.id && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px' }}>나</span>}
              <span style={{ fontSize: 9, borderRadius: 4, padding: '2px 7px', fontWeight: 700, background: m.role==='admin' ? 'rgba(168,85,247,0.12)' : C.surfaceAlt, color: m.role==='admin' ? C.brick : C.text2 }}>
                {m.role === 'admin' ? 'ADMIN' : 'MEMBER'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>가입 {m.created_at?.slice(0,10)} · 훈련 {m.workout_count}회</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => openEdit(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: C.accentBg, color: C.accent }}>수정</button>
            {m.id !== currentUser?.id && <>
              <button onClick={() => handleApproveToggle(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: m.can_approve ? 'rgba(0,220,130,0.12)' : C.surfaceAlt, color: m.can_approve ? '#00DC82' : C.text2 }}>
                {m.can_approve ? '승인권한✓' : '승인권한'}
              </button>
              <button onClick={() => handleRoleToggle(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: m.role==='admin' ? C.surfaceAlt : 'rgba(168,85,247,0.12)', color: m.role==='admin' ? C.text2 : C.brick }}>
                {m.role === 'admin' ? '해제' : '관리자'}
              </button>
              <button onClick={() => handleDelete(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: C.errorBg, color: C.error }}>삭제</button>
            </>}
          </div>
        </div>
      ))}
    </div>
  )
}

function MessagesTab({ onBadge }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getInbox()
      setItems(data)
      onBadge(data.filter(m => !m.is_read).length)
    } finally { setLoading(false) }
  }

  async function openThread(msg) {
    const thread = await api.getThread(msg.id)
    setSelected(thread)
    setReplyText('')
    setItems(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    onBadge(items.filter(m => !m.is_read && m.id !== msg.id).length)
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return
    setReplying(true)
    try {
      const reply = await api.replyMessage(selected.original.id, replyText)
      setSelected(prev => ({ ...prev, replies: [...prev.replies, reply] }))
      setReplyText('')
    } finally { setReplying(false) }
  }

  async function handleDelete(id) {
    if (!confirm('쪽지를 삭제할까요?')) return
    await api.deleteMessage(id)
    setItems(prev => prev.filter(m => m.id !== id))
    setSelected(null)
    onBadge(items.filter(m => !m.is_read && m.id !== id).length)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>

  if (selected) {
    const { original, replies } = selected
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>← 목록</button>
          <span style={{ fontSize: 13, color: C.text2, flex: 1 }}>{original.from_nickname}</span>
          <button onClick={() => handleDelete(original.id)} style={{ background: C.errorBg, border: 'none', borderRadius: 7, color: C.error, fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}>삭제</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>{original.from_nickname} · {original.created_at?.slice(0, 16).replace('T', ' ')}</div>
            <div style={{ fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{original.body}</div>
          </div>
          {replies.map(r => (
            <div key={r.id} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, marginLeft: 12 }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 6 }}>관리자 · {r.created_at?.slice(0, 16).replace('T', ' ')}</div>
              <div style={{ fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.body}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="답장을 입력하세요..."
            style={{ flex: 1, padding: '10px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none' }} />
          <button onClick={sendReply} disabled={replying || !replyText.trim()} style={{ padding: '10px 16px', background: replying ? C.surfaceHigh : C.accent, border: 'none', borderRadius: 10, color: replying ? C.text2 : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>전송</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>
        전체 {items.length}건 · 미확인 {items.filter(m => !m.is_read).length}건
      </div>
      {items.length === 0
        ? <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>받은 문의가 없습니다</div>
          </div>
        : items.map(m => (
          <button key={m.id} onClick={() => openThread(m)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: m.is_read ? 'transparent' : C.accentBg + '55', cursor: 'pointer', border: 'none' }}>
            <Avatar nickname={m.from_nickname} avatar_color={m.from_avatar_color} avatar_image={m.from_avatar_image} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: m.is_read ? 600 : 800, color: C.text }}>{m.from_nickname}</span>
                <span style={{ fontSize: 10, color: C.text3 }}>{m.created_at?.slice(0, 10)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.body}</div>
              {m.reply_count > 0 && <div style={{ fontSize: 10, color: C.accent, marginTop: 3 }}>답장 {m.reply_count}개</div>}
            </div>
            {!m.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, flexShrink: 0, marginTop: 4 }} />}
          </button>
        ))
      }
    </div>
  )
}

const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
