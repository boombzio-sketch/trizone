import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { Navigate } from 'react-router-dom'
import { C } from '../utils/theme'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('pending')

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 16px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>⚙️ 관리</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['pending','훈련 승인'],['memberships','클럽 가입'],['leaderApps','클럽장 신청'],['members','회원 관리']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              color: tab===k ? C.accent : C.text2,
              borderBottom: tab===k ? `2px solid ${C.accent}` : '2px solid transparent',
            }}>{l}</button>
          ))}
        </div>
      </div>
      {tab === 'pending' && <PendingTab />}
      {tab === 'memberships' && <MembershipsTab />}
      {tab === 'leaderApps' && <LeaderAppsTab />}
      {tab === 'members' && <MembersTab user={user} />}
    </div>
  )
}

function PendingTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setItems(await api.getPendingWorkouts()) }
    finally { setLoading(false) }
  }

  async function handle(id, status) {
    await api.setWorkoutStatus(id, status)
    setItems(prev => prev.filter(w => w.id !== id))
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
      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>
        승인 대기 {items.length}건
      </div>
      {items.map(w => {
        const sc = SPORT_COLOR[w.sport_type] || C.accent
        const segs = w.sport_type === 'brick' ? (() => { try { return JSON.parse(w.brick_segments||'[]') } catch { return [] } })() : null
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
                <div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>{(w.score||0).toFixed(1)}pt</div>
              </div>

              <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                {segs ? (
                  segs.map((s,i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text2, marginBottom: 3 }}>
                      <span>{SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}</span>
                      <span style={{ fontWeight: 700, color: C.text }}>{s.distance_km}km · {formatDuration(s.duration_sec)}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
                    {w.distance_km}km · {formatDuration(w.duration_sec)}
                  </div>
                )}
                {w.memo && <div style={{ fontSize: 11, color: C.text2, marginTop: 6, fontStyle: 'italic' }}>{w.memo}</div>}
              </div>

              {w.photo && (
                <img src={w.photo} alt="훈련 사진" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover', display: 'block', marginBottom: 10 }} />
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handle(w.id, 'rejected')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700 }}>
                  ✕ 반려
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

function LeaderAppsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getClubLeaderApps()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  async function handle(userId, status) {
    await api.setClubLeaderAppStatus(userId, status)
    setItems(prev => prev.filter(m => m.user_id !== userId))
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

function MembershipsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setItems(await api.getPendingMemberships()) }
    finally { setLoading(false) }
  }

  async function handle(userId, status) {
    await api.setMembershipStatus(userId, status)
    setItems(prev => prev.filter(m => m.user_id !== userId))
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

function MembersTab({ user: currentUser }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getAdminMembers()
      .then(setMembers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleRoleToggle(member) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`${member.nickname}의 역할을 ${newRole === 'admin' ? '관리자' : '일반회원'}으로 변경할까요?`)) return
    try {
      await api.setAdminMemberRole(member.id, newRole)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    } catch (e) { alert(e.message) }
  }

  async function handleDelete(member) {
    if (!confirm(`${member.nickname} 회원을 삭제할까요?\n모든 데이터가 삭제됩니다.`)) return
    try {
      await api.deleteAdminMember(member.id)
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
  if (error) return <div style={{ textAlign: 'center', padding: 48, color: C.error, fontSize: 13 }}>{error}</div>

  return (
    <div>
      <div style={{ padding: '10px 16px 4px', fontSize: 11, color: C.text2 }}>총 {members.length}명</div>
      {members.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: m.avatar_color }}>
            {m.nickname?.charAt(0)}
          </div>
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
          {m.id !== currentUser?.id && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => handleRoleToggle(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: m.role==='admin' ? C.surfaceAlt : 'rgba(168,85,247,0.12)', color: m.role==='admin' ? C.text2 : C.brick }}>
                {m.role === 'admin' ? '해제' : '관리자'}
              </button>
              <button onClick={() => handleDelete(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: C.errorBg, color: C.error }}>삭제</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
