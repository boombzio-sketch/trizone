import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'
import { C } from '../utils/theme'
import Avatar from '../components/Avatar.jsx'

const BASE = (import.meta.env.VITE_API_URL || '') + '/api'
const tok = () => localStorage.getItem('tz_token')
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
    ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '오류')
  return data
}

const AVATAR_COLORS = ['#4DB8FF','#00DC82','#FFA000','#CC64FF','#FF5080','#00BFFF','#FF8C42','#A8FF3E','#4F9CF9','#EF4444','#F59E0B','#10B981']

export default function MyPage() {
  const { user, logout, refreshUser } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ password: '', avatar_color: '', avatar_image: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function openEdit() {
    setEditForm({ password: '', avatar_color: user?.avatar_color || '#4DB8FF', avatar_image: user?.avatar_image || '' })
    setEditError('')
    setEditOpen(true)
  }

  async function handleSave() {
    setEditSaving(true); setEditError('')
    try {
      await api.updateProfile(editForm)
      await refreshUser()
      setEditOpen(false)
    } catch (e) { setEditError(e.message) }
    finally { setEditSaving(false) }
  }
  const [profile, setProfile] = useState(null)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followerList, setFollowerList] = useState([])
  const [followingList, setFollowingList] = useState([])

  useEffect(() => {
    if (user?.id) req('/social/profile/' + user.id).then(setProfile)
  }, [user])

  async function openFollowers() {
    const rows = await req('/social/followers/' + user.id)
    setFollowerList(rows); setShowFollowers(true)
  }
  async function openFollowing() {
    const rows = await req('/social/following/' + user.id)
    setFollowingList(rows); setShowFollowing(true)
  }
  async function toggleFollow(targetId, isFollowing) {
    if (isFollowing) await req('/social/follow/' + targetId, { method: 'DELETE' })
    else await req('/social/follow/' + targetId, { method: 'POST' })
    setFollowingList(prev => prev.map(u => u.id === targetId ? { ...u, i_follow: isFollowing ? 0 : 1 } : u))
    setFollowerList(prev => prev.map(u => u.id === targetId ? { ...u, i_follow: isFollowing ? 0 : 1 } : u))
  }

  const stats = profile?.stats || []

  return (
    <div style={{ padding: 14 }}>

      {/* 프로필 편집 모달 */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>프로필 수정</div>

            {/* 아바타 미리보기 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Avatar nickname={user?.nickname} avatar_color={editForm.avatar_color} avatar_image={editForm.avatar_image} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>프로필 사진</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ padding: '6px 12px', background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.accent }}>
                    📷 선택
                    <input type="file" accept="image/*" onChange={e => {
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
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 색상 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase' }}>아바타 색상</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATAR_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setEditForm(p => ({ ...p, avatar_color: color }))} style={{
                    width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: color,
                    outline: editForm.avatar_color === color ? `3px solid ${C.text}` : '3px solid transparent',
                    outlineOffset: 2,
                  }} />
                ))}
              </div>
            </div>

            {/* 비밀번호 */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase' }}>새 비밀번호</div>
              <input type="password" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                placeholder="변경 시만 입력 (4자 이상)"
                style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {editError && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: C.error }}>{editError}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditOpen(false)} style={{ flex: 1, padding: '11px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={editSaving} style={{ flex: 2, padding: '11px', background: editSaving ? C.surfaceHigh : C.accent, border: 'none', borderRadius: 12, color: editSaving ? C.text2 : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {editSaving ? '저장 중...' : '💾 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 카드 */}
      <div style={{ background: C.surface, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <Avatar nickname={user?.nickname} avatar_color={user?.avatar_color} avatar_image={user?.avatar_image} size={60} style={{ border: `3px solid ${user?.avatar_color||C.accent}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              {user?.nickname}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              {user?.role === 'admin' && <span style={{ fontSize: 10, background: C.goldBg, color: C.gold, borderRadius: 6, padding: '2px 7px' }}>👑 관리자</span>}
              {user?.can_approve && user?.role !== 'admin' && <span style={{ fontSize: 10, background: 'rgba(0,220,130,0.12)', color: '#00DC82', borderRadius: 6, padding: '2px 7px' }}>✅ 승인관리자</span>}
              {user?.is_club_leader && <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, borderRadius: 6, padding: '2px 7px' }}>🏆 클럽관리자</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={openEdit} style={{ fontSize: 12, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 700 }}>수정</button>
            <button onClick={logout} style={{ fontSize: 12, color: C.text2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>로그아웃</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          {[
            { label: '팔로워', val: profile?.follower_count || 0, onClick: openFollowers },
            { label: '팔로잉', val: profile?.following_count || 0, onClick: openFollowing },
            { label: '훈련 횟수', val: stats.reduce((a,s) => a+(s.cnt||0), 0), onClick: null },
          ].map((item, i) => (
            <button key={i} onClick={item.onClick} style={{ background: 'none', border: 'none', cursor: item.onClick ? 'pointer' : 'default', textAlign: 'center', padding: '4px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{item.val}</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 최근 훈련 */}
      {profile?.recentWorkouts?.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>최근 훈련</div>
        {profile.recentWorkouts.map(w => (
          <div key={w.id} style={{ margin: '0 0 8px', background: C.surface, borderRadius: 12, overflow: 'hidden', borderLeft: `3px solid ${SPORT_COLOR[w.sport_type]}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: SPORT_COLOR[w.sport_type]+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{SPORT_ICON[w.sport_type]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: SPORT_COLOR[w.sport_type] }}>{SPORT_LABEL[w.sport_type]}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{formatDuration(w.duration_sec)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>{(w.distance_km||0).toFixed(2)}km</div>
                <div style={{ fontSize: 10, color: C.text3 }}>{w.logged_at}</div>
              </div>
            </div>
          </div>
        ))}
      </>)}

      {showFollowers && <FollowModal title="팔로워" list={followerList} myId={user?.id} onToggle={toggleFollow} onClose={() => setShowFollowers(false)} />}
      {showFollowing && <FollowModal title="팔로잉" list={followingList} myId={user?.id} onToggle={toggleFollow} onClose={() => setShowFollowing(false)} />}
    </div>
  )
}

function FollowModal({ title, list, myId, onToggle, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', maxHeight: '70vh', overflow: 'auto', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.text2, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        {list.length === 0
          ? <div style={{ textAlign: 'center', padding: 32, color: C.text2, fontSize: 13 }}>아직 없습니다.</div>
          : list.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.avatar_color+'22', border: `2px solid ${u.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: u.avatar_color }}>
                {u.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{u.nickname}</div>
              {u.id !== myId && (
                <button onClick={() => onToggle(u.id, u.i_follow)} style={{
                  padding: '7px 16px', border: 'none', borderRadius: 100, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: u.i_follow ? C.surfaceHigh : C.accent,
                  color: u.i_follow ? C.accent : '#fff',
                }}>
                  {u.i_follow ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
          ))
        }
      </div>
    </div>
  )
}
