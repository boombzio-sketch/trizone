import { useState, useEffect, useRef } from 'react'
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
  const [editForm, setEditForm] = useState({ nickname: '', email: '', password: '', avatar_color: '', avatar_image: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [cropUrl, setCropUrl] = useState(null)

  function openEdit() {
    setEditForm({ nickname: user?.nickname || '', email: user?.email || '', password: '', avatar_color: user?.avatar_color || '#4DB8FF', avatar_image: user?.avatar_image || '' })
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
  const [showAvatarModal, setShowAvatarModal] = useState(false)
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

  const [showCompose, setShowCompose] = useState(false)
  const [msgBody, setMsgBody] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [myMessages, setMyMessages] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)

  useEffect(() => {
    if (user?.id) api.getMyMessages().then(setMyMessages).catch(() => {})
  }, [user])

  async function sendMsg() {
    if (!msgBody.trim()) return
    setMsgSending(true)
    try {
      await api.sendMessage(msgBody)
      setMsgBody(''); setShowCompose(false)
      setMyMessages(await api.getMyMessages())
    } finally { setMsgSending(false) }
  }

  async function openThread(msg) {
    const thread = await api.getThread(msg.id)
    setSelectedThread(thread)
    setMyMessages(await api.getMyMessages())
  }

  return (
    <div style={{ padding: 14 }}>

      {/* 프로필 편집 모달 */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>프로필 수정</div>

            {/* 닉네임 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>닉네임</div>
              <input value={editForm.nickname} onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))}
                placeholder="닉네임" autoComplete="off"
                style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {/* 이메일 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>이메일</div>
              <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                placeholder="example@email.com" autoComplete="email"
                style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

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
                      setCropUrl(URL.createObjectURL(file))
                      e.target.value = ''
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
      <div style={{ background: 'linear-gradient(160deg, #0E2040 0%, #091320 100%)', borderRadius: 20, padding: 18, border: `1px solid rgba(56,189,248,0.15)`, marginBottom: 12, boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ position: 'relative' }} onClick={() => setShowAvatarModal(true)}>
            <Avatar nickname={user?.nickname} avatar_color={user?.avatar_color} avatar_image={user?.avatar_image} size={64} onClick={() => setShowAvatarModal(true)} />
            <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `2px solid ${user?.avatar_color||C.accent}`, boxShadow: `0 0 14px ${user?.avatar_color||C.accent}60`, pointerEvents: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{user?.nickname}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
              {user?.role === 'admin' && <span style={{ fontSize: 10, background: C.goldBg, color: C.gold, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>👑 관리자</span>}
              {user?.can_approve && user?.role !== 'admin' && <span style={{ fontSize: 10, background: 'rgba(16,240,144,0.12)', color: C.success, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>✅ 승인관리자</span>}
              {user?.is_club_leader && <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>🏆 클럽관리자</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={openEdit} style={{ fontSize: 12, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 700 }}>수정</button>
            <button onClick={logout} style={{ fontSize: 12, color: C.text2, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>로그아웃</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: `1px solid rgba(56,189,248,0.1)`, paddingTop: 16 }}>
          {[
            { label: '팔로워', val: profile?.follower_count || 0, onClick: openFollowers },
            { label: '팔로잉', val: profile?.following_count || 0, onClick: openFollowing },
            { label: '총 훈련', val: stats.reduce((a,s) => a+(s.cnt||0), 0), onClick: null },
          ].map((item, i) => (
            <button key={i} onClick={item.onClick} style={{ background: 'none', border: 'none', cursor: item.onClick ? 'pointer' : 'default', textAlign: 'center', padding: '4px 0' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{item.val}</div>
              <div style={{ fontSize: 10, color: C.text2, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 최근 훈련 */}
      {profile?.recentWorkouts?.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>최근 훈련</div>
        {profile.recentWorkouts.map(w => {
          const sc = SPORT_COLOR[w.sport_type]
          return (
            <div key={w.id} style={{ margin: '0 0 8px', background: `linear-gradient(135deg, ${sc}10 0%, transparent 60%)`, borderRadius: 14, overflow: 'hidden', border: `1px solid ${sc}25`, borderTop: `2px solid ${sc}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: sc+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${sc}30` }}>{SPORT_ICON[w.sport_type]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: sc, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{SPORT_LABEL[w.sport_type]}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{formatDuration(w.duration_sec)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{(w.distance_km||0).toFixed(2)}<span style={{ fontSize: 10, color: sc, marginLeft: 2 }}>km</span></div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{w.logged_at}</div>
                </div>
              </div>
            </div>
          )
        })}
      </>)}

      {/* 관리자 문의 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>관리자 문의</div>
          <button onClick={() => { setShowCompose(true); setMsgBody('') }} style={{ fontSize: 12, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 700 }}>
            + 문의하기
          </button>
        </div>
        {myMessages.length === 0
          ? <div style={{ fontSize: 12, color: C.text2, textAlign: 'center', padding: '20px 0' }}>문의 내역이 없습니다.</div>
          : myMessages.map(m => (
            <button key={m.id} onClick={() => openThread(m)} style={{ width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.body}</div>
                {m.unread_replies > 0 && <span style={{ fontSize: 10, background: C.accent, color: '#fff', borderRadius: 99, padding: '2px 7px', fontWeight: 800, flexShrink: 0 }}>답장</span>}
                {m.reply_count > 0 && !m.unread_replies && <span style={{ fontSize: 10, color: C.text3, flexShrink: 0 }}>답장 {m.reply_count}</span>}
              </div>
              <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>{m.created_at?.slice(0, 16).replace('T', ' ')}</div>
            </button>
          ))
        }
      </div>

      {/* 쪽지 작성 모달 */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>📨 관리자에게 문의</div>
            <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={5}
              placeholder="문의 내용을 입력하세요..."
              style={{ width: '100%', padding: '12px 14px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowCompose(false)} style={{ flex: 1, padding: '12px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={sendMsg} disabled={msgSending || !msgBody.trim()} style={{ flex: 2, padding: '12px', background: msgSending ? C.surfaceHigh : C.accent, border: 'none', borderRadius: 12, color: msgSending ? C.text2 : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {msgSending ? '전송 중...' : '📨 전송'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스레드 모달 */}
      {selectedThread && (
        <ThreadModal thread={selectedThread} user={user} onClose={() => setSelectedThread(null)} />
      )}

      {cropUrl && (
        <AvatarCropModal
          imageUrl={cropUrl}
          onSave={dataUrl => { setEditForm(p => ({ ...p, avatar_image: dataUrl })); URL.revokeObjectURL(cropUrl); setCropUrl(null) }}
          onClose={() => { URL.revokeObjectURL(cropUrl); setCropUrl(null) }}
        />
      )}
      {showAvatarModal && (
        <AvatarModal nickname={user?.nickname} avatar_color={user?.avatar_color} avatar_image={user?.avatar_image} onClose={() => setShowAvatarModal(false)} />
      )}
      {showFollowers && <FollowModal title="팔로워" list={followerList} myId={user?.id} onToggle={toggleFollow} onClose={() => setShowFollowers(false)} />}
      {showFollowing && <FollowModal title="팔로잉" list={followingList} myId={user?.id} onToggle={toggleFollow} onClose={() => setShowFollowing(false)} />}
    </div>
  )
}

function AvatarCropModal({ imageUrl, onSave, onClose }) {
  const DISPLAY = 260
  const OUTPUT  = 600

  const imgRef  = useRef(null)
  const drag    = useRef(null)
  const pinch   = useRef(null)
  const vals    = useRef({ us: 1, ox: 0, oy: 0, nw: 1, nh: 1 })

  const [loaded, setLoaded] = useState(false)
  const [nw, setNw] = useState(1)
  const [nh, setNh] = useState(1)
  const [us, setUs] = useState(1)   // user scale multiplier
  const [ox, setOx] = useState(0)   // offset x
  const [oy, setOy] = useState(0)   // offset y

  useEffect(() => { vals.current = { us, ox, oy, nw, nh } })

  function minS(w, h) { return Math.max(DISPLAY / w, DISPLAY / h) }

  function clamp(x, y, sc, w, h) {
    const v = vals.current
    const rw = w ?? v.nw, rh = h ?? v.nh
    const as = minS(rw, rh) * sc
    const mx = Math.max(0, (rw * as - DISPLAY) / 2)
    const my = Math.max(0, (rh * as - DISPLAY) / 2)
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) }
  }

  function applyOffset(x, y) {
    const { x: cx, y: cy } = clamp(x, y, vals.current.us)
    setOx(cx); setOy(cy)
  }

  // Touch handlers (attached imperatively to avoid passive listener issue)
  useEffect(() => {
    const el = imgRef.current?.parentElement
    if (!el) return

    function tStart(e) {
      e.preventDefault()
      const v = vals.current
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinch.current = { dist: Math.hypot(dx, dy), scale: v.us, ox: v.ox, oy: v.oy }
        drag.current = null
      } else {
        drag.current = { sx: e.touches[0].clientX - v.ox, sy: e.touches[0].clientY - v.oy }
        pinch.current = null
      }
    }

    function tMove(e) {
      e.preventDefault()
      const v = vals.current
      if (e.touches.length === 2 && pinch.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const newUs = Math.max(1, Math.min(5, pinch.current.scale * Math.hypot(dx, dy) / pinch.current.dist))
        const c = clamp(pinch.current.ox, pinch.current.oy, newUs)
        setUs(newUs); setOx(c.x); setOy(c.y)
      } else if (e.touches.length === 1 && drag.current) {
        applyOffset(e.touches[0].clientX - drag.current.sx, e.touches[0].clientY - drag.current.sy)
      }
    }

    function tEnd(e) {
      if (e.touches.length < 2) pinch.current = null
      if (e.touches.length === 0) drag.current = null
    }

    el.addEventListener('touchstart', tStart, { passive: false })
    el.addEventListener('touchmove',  tMove,  { passive: false })
    el.addEventListener('touchend',   tEnd)
    return () => {
      el.removeEventListener('touchstart', tStart)
      el.removeEventListener('touchmove',  tMove)
      el.removeEventListener('touchend',   tEnd)
    }
  }, [loaded])

  function mDown(e) { drag.current = { sx: e.clientX - vals.current.ox, sy: e.clientY - vals.current.oy } }
  function mMove(e) { if (drag.current) applyOffset(e.clientX - drag.current.sx, e.clientY - drag.current.sy) }
  function mUp()    { drag.current = null }

  function zoom(d) {
    const v = vals.current
    const next = Math.max(1, Math.min(5, v.us + d))
    const c = clamp(v.ox, v.oy, next)
    setUs(next); setOx(c.x); setOy(c.y)
  }

  function handleSave() {
    const v = vals.current
    const as = minS(v.nw, v.nh) * v.us
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT; canvas.height = OUTPUT
    const r  = (DISPLAY / 2) / as
    const cx = v.nw / 2 - v.ox / as
    const cy = v.nh / 2 - v.oy / as
    canvas.getContext('2d').drawImage(imgRef.current, cx - r, cy - r, r * 2, r * 2, 0, 0, OUTPUT, OUTPUT)
    onSave(canvas.toDataURL('image/jpeg', 0.95))
  }

  const as   = minS(nw, nh) * us
  const imgL = DISPLAY / 2 - nw * as / 2 + ox
  const imgT = DISPLAY / 2 - nh * as / 2 + oy
  const btn  = { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050A12', zIndex: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        드래그로 위치 · 핀치로 확대/축소
      </div>

      {/* 크롭 원 */}
      <div style={{
        width: DISPLAY, height: DISPLAY, borderRadius: '50%', overflow: 'hidden',
        position: 'relative', cursor: 'grab', userSelect: 'none', touchAction: 'none',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.5), 0 0 0 5px rgba(0,0,0,0.8), 0 0 48px rgba(56,189,248,0.25)',
        opacity: loaded ? 1 : 0, transition: 'opacity .3s',
      }}
        onMouseDown={mDown} onMouseMove={mMove} onMouseUp={mUp} onMouseLeave={mUp}
      >
        <img ref={imgRef} src={imageUrl} alt="" draggable={false}
          onLoad={e => { setNw(e.target.naturalWidth); setNh(e.target.naturalHeight); setLoaded(true) }}
          style={{ position: 'absolute', width: nw * as, height: nh * as, left: imgL, top: imgT, pointerEvents: 'none', userSelect: 'none' }}
        />
      </div>
      {!loaded && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, position: 'absolute' }}>⏳</div>}

      {/* 줌 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => zoom(-0.15)} style={{ ...btn, width: 44, height: 44, fontSize: 24 }}>−</button>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, minWidth: 52, textAlign: 'center', letterSpacing: '0.05em' }}>
          {Math.round(us * 100)}%
        </span>
        <button onClick={() => zoom(0.15)} style={{ ...btn, width: 44, height: 44, fontSize: 24 }}>+</button>
      </div>

      {/* 저장/취소 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onClose} style={{ ...btn, padding: '12px 26px', fontSize: 14 }}>취소</button>
        <button onClick={handleSave} style={{ padding: '12px 36px', background: '#38BDF8', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✓ 저장
        </button>
      </div>
    </div>
  )
}

function AvatarModal({ nickname, avatar_color, avatar_image, onClose }) {
  const color = avatar_color || C.accent
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      {avatar_image
        ? <img src={avatar_image} alt={nickname} draggable={false} style={{ width: 240, height: 240, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${color}`, boxShadow: `0 0 40px ${color}60`, pointerEvents: 'none' }} />
        : <div style={{ width: 200, height: 200, borderRadius: '50%', background: color + '22', border: `4px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, fontWeight: 900, color, boxShadow: `0 0 40px ${color}60` }}>
            {nickname?.charAt(0) || '?'}
          </div>
      }
      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{nickname}</div>
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
    </div>
  )
}

function ThreadModal({ thread, user, onClose }) {
  const { original, replies } = thread
  const isAdmin = user?.role === 'admin' || user?.can_approve
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', maxHeight: '75vh', display: 'flex', flexDirection: 'column', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>📨 문의 내역</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.text2, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '14px 16px', flex: 1 }}>
          {/* 원본 */}
          <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>{original.from_nickname} · {original.created_at?.slice(0, 16).replace('T', ' ')}</div>
            <div style={{ fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{original.body}</div>
          </div>
          {/* 답장들 */}
          {replies.map(r => (
            <div key={r.id} style={{ background: isAdmin ? C.surfaceAlt : C.accentBg, border: `1px solid ${isAdmin ? C.border : C.accentBorder}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, marginLeft: 12 }}>
              <div style={{ fontSize: 11, color: C.accent, marginBottom: 6, fontWeight: 700 }}>관리자 · {r.created_at?.slice(0, 16).replace('T', ' ')}</div>
              <div style={{ fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.body}</div>
            </div>
          ))}
          {replies.length === 0 && <div style={{ fontSize: 12, color: C.text2, textAlign: 'center', padding: '12px 0' }}>아직 답장이 없습니다.</div>}
        </div>
      </div>
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
