import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { Navigate } from 'react-router-dom'
import { C } from '../utils/theme'
import Avatar from '../components/Avatar.jsx'

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('leaderApps')
  const [badges, setBadges] = useState({ leaderApps: null, members: null })

  const isAdmin = user?.role === 'admin'

  if (!isAdmin) return <Navigate to="/" replace />

  const setBadge = (key, count) => setBadges(prev => ({ ...prev, [key]: count }))

  const tabDefs = [
    { key: 'leaderApps',  label: '클럽장 신청', badge: badges.leaderApps },
    { key: 'members',     label: '회원 관리',  badge: badges.members },
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
      <div style={{ display: tab === 'leaderApps' ? 'block' : 'none' }}><LeaderAppsTab onBadge={c => setBadge('leaderApps', c)} /></div>
      <div style={{ display: tab === 'members' ? 'block' : 'none' }}><MembersTab user={user} onBadge={c => setBadge('members', c)} /></div>
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

  async function handle(clubId, userId, status) {
    await api.setMembershipStatus(clubId, userId, status)
    setItems(prev => {
      const next = prev.filter(m => !(m.club_id === clubId && m.user_id === userId))
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
            <button onClick={() => handle(m.club_id, m.user_id, 'rejected')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700 }}>
              ✕ 거절
            </button>
            <button onClick={() => handle(m.club_id, m.user_id, 'approved')} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.successBg, color: C.success, fontSize: 13, fontWeight: 700 }}>
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
  const [editForm, setEditForm] = useState({ nickname: '', email: '', avatar_color: '', password: '', avatar_image: '' })
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
    setEditForm({ nickname: m.nickname, email: m.email || '', avatar_color: m.avatar_color, password: '', avatar_image: m.avatar_image || '' })
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
    if (!confirm(`${member.nickname}의 기록 수정 권한을 ${next ? '부여' : '회수'}할까요?`)) return
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
              <label style={labelSt}>
                이메일
                {!editingMember?.email && <span style={{ marginLeft: 6, fontSize: 10, background: '#F59E0B22', color: '#F59E0B', borderRadius: 4, padding: '1px 6px' }}>미등록</span>}
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(p => ({...p, email: e.target.value}))}
                placeholder="example@email.com"
                style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${editingMember?.email ? C.border : '#F59E0B44'}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
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
            <div style={{ fontSize: 10, color: C.text2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              가입 {m.created_at?.slice(0,10)} · 훈련 {m.workout_count}회
              {!m.email && <span style={{ background: '#F59E0B22', color: '#F59E0B', borderRadius: 4, padding: '0px 5px', fontWeight: 700 }}>이메일 미등록</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => openEdit(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: C.accentBg, color: C.accent }}>수정</button>
            {m.id !== currentUser?.id && <>
              <button onClick={() => handleApproveToggle(m)} style={{ padding: '7px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: m.can_approve ? 'rgba(0,220,130,0.12)' : C.surfaceAlt, color: m.can_approve ? '#00DC82' : C.text2 }}>
                {m.can_approve ? '수정권한✓' : '수정권한'}
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

const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
