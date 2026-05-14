import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'
import { C, cardSport } from '../utils/theme'
import { api } from '../utils/api'
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

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('club')
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [openComments, setOpenComments] = useState(null)
  const [editingFeed, setEditingFeed] = useState(null)
  const [myClubs, setMyClubs] = useState([])
  const [selectedClubId, setSelectedClubId] = useState(null)
  const searchTimer = useRef(null)

  useEffect(() => {
    api.getMyClubs().then(setMyClubs).catch(() => {})
  }, [])

  useEffect(() => { loadFeed() }, [tab, selectedClubId])

  async function loadFeed() {
    setLoading(true)
    try {
      let path
      if (tab === 'following') path = '/social/feed'
      else if (tab === 'club')  path = `/social/feed/club${selectedClubId ? `?club_id=${selectedClubId}` : ''}`
      else if (tab === 'mine')  path = '/social/feed/mine'
      else                      path = '/social/feed/all'
      const rows = await req(path)
      setFeeds(rows)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchQ.trim()) { setSearchRes([]); return }
    searchTimer.current = setTimeout(async () => {
      const rows = await req('/social/users/search?q=' + encodeURIComponent(searchQ))
      setSearchRes(rows)
    }, 300)
  }, [searchQ])

  async function toggleStar(workoutId) {
    const data = await req('/social/like/' + workoutId, { method: 'POST' })
    setFeeds(prev => prev.map(f =>
      f.id === workoutId ? { ...f, like_count: data.count, my_like: data.liked ? 1 : null } : f
    ))
  }

  async function toggleFollow(targetId, isFollowing) {
    if (isFollowing) await req('/social/follow/' + targetId, { method: 'DELETE' })
    else await req('/social/follow/' + targetId, { method: 'POST' })
    setSearchRes(prev => prev.map(u =>
      u.id === targetId ? { ...u, i_follow: isFollowing ? 0 : 1 } : u
    ))
  }

  async function handleEditSave(id, body) {
    const updated = await api.editWorkout(id, body)
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f))
    setEditingFeed(null)
  }

  async function handleDelete(id) {
    if (!confirm('이 기록을 삭제할까요?')) return
    await api.deleteWorkout(id)
    setFeeds(prev => prev.filter(f => f.id !== id))
  }

  const TABS = [
    { key: 'following', label: '팔로잉' },
    { key: 'club',      label: '클럽' },
    { key: 'all',       label: '전체' },
    { key: 'mine',      label: '내피드' },
  ]

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: C.surface, borderBottom: tab === 'club' && myClubs.length > 1 ? 'none' : `1px solid ${C.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 100,
              background: tab === t.key ? C.accent : C.surfaceAlt,
              color: tab === t.key ? '#fff' : C.text2,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => navigate('/workout')} style={{
            background: C.accent, border: 'none',
            borderRadius: 10, padding: '7px 14px', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
          }}>+</button>
          <button onClick={() => setShowSearch(s => !s)} style={{
            background: showSearch ? C.accentBg : C.surfaceAlt,
            border: `1px solid ${showSearch ? C.accentBorder : C.border}`,
            borderRadius: 10, padding: '7px 10px', color: C.accent, fontSize: 14, cursor: 'pointer',
          }}>🔍</button>
        </div>
      </div>

      {/* 클럽 선택 칩 (클럽 탭 + 여러 클럽 가입 시) */}
      {tab === 'club' && myClubs.length > 1 && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '6px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          <button
            onClick={() => setSelectedClubId(null)}
            style={{
              padding: '4px 14px', border: 'none', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0,
              background: selectedClubId === null ? C.accent : C.surfaceAlt,
              color: selectedClubId === null ? '#fff' : C.text2,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
            전체 클럽
          </button>
          {myClubs.map(club => (
            <button key={club.id}
              onClick={() => setSelectedClubId(club.id === selectedClubId ? null : club.id)}
              style={{
                padding: '4px 14px', border: 'none', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0,
                background: selectedClubId === club.id ? C.accent : C.surfaceAlt,
                color: selectedClubId === club.id ? '#fff' : C.text2,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
              {club.name}
            </button>
          ))}
        </div>
      )}

      {/* 검색 패널 */}
      {showSearch && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 14px' }}>
          <input
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="닉네임으로 검색..."
            style={{ width: '100%', padding: '10px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
          {searchRes.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: `1px solid ${C.border}` }}>
              <Avatar nickname={u.nickname} avatar_color={u.avatar_color} avatar_image={u.avatar_image} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{u.nickname}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>팔로워 {u.follower_count}명</div>
              </div>
              {u.id !== user?.id && (
                <button onClick={() => toggleFollow(u.id, u.i_follow)} style={{
                  padding: '6px 14px', border: 'none', borderRadius: 100, cursor: 'pointer',
                  background: u.i_follow ? C.surfaceHigh : C.accent,
                  color: u.i_follow ? C.accent : '#fff',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {u.i_follow ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 편집 모달 */}
      {editingFeed && (
        <EditModal feed={editingFeed} onSave={handleEditSave} onClose={() => setEditingFeed(null)} />
      )}

      {/* 피드 */}
      <div style={{ padding: '8px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 로딩 중...</div>
        ) : feeds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.text2, fontSize: 14, lineHeight: 1.9 }}>
            {tab === 'following' ? '아직 팔로우한 사람이 없어요.'
              : tab === 'club' ? (selectedClubId ? `선택한 클럽의 훈련 기록이 없습니다.` : '클럽 회원의 기록이 없습니다.')
              : tab === 'mine' ? '아직 내 훈련 기록이 없습니다.'
              : '아직 훈련 기록이 없습니다.'}
          </div>
        ) : feeds.map(f => (
          <FeedCard
            key={f.id} feed={f} myId={user?.id} user={user}
            onStar={() => toggleStar(f.id)}
            openComments={openComments} setOpenComments={setOpenComments}
            onEdit={() => setEditingFeed(f)}
            onDelete={handleDelete}
            onStatusChange={(id, status) => setFeeds(prev => prev.map(x => x.id === id ? { ...x, status } : x))}
          />
        ))}
      </div>
    </div>
  )
}

function secsToDur(sec) {
  const s = sec || 0
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
function durToSecs(d) { return (Number(d.h) || 0) * 3600 + (Number(d.m) || 0) * 60 + (Number(d.s) || 0) }

function DurInput({ value, onChange, style }) {
  const iSt = { width: 44, padding: '9px 4px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, ...style }}>
      <input type="number" min={0} value={value.h} onChange={e => onChange({ ...value, h: e.target.value })} style={iSt} placeholder="h" />
      <span style={{ color: C.text2, fontSize: 13 }}>:</span>
      <input type="number" min={0} max={59} value={value.m} onChange={e => onChange({ ...value, m: e.target.value })} style={iSt} placeholder="m" />
      <span style={{ color: C.text2, fontSize: 13 }}>:</span>
      <input type="number" min={0} max={59} value={value.s} onChange={e => onChange({ ...value, s: e.target.value })} style={iSt} placeholder="s" />
    </div>
  )
}

function EditModal({ feed, onSave, onClose }) {
  const isBrick = feed.sport_type === 'brick'
  const initSegs = isBrick
    ? (() => { try { return JSON.parse(feed.brick_segments || '[]') } catch { return [] } })()
    : null

  const [date, setDate]           = useState(feed.logged_at?.slice(0, 10) || '')
  const [distKm, setDistKm]       = useState(feed.distance_km || 0)
  const [dur, setDur]             = useState(secsToDur(feed.duration_sec))
  const [poolType, setPoolType]   = useState(feed.pool_type || '')
  const [courseType, setCourseType] = useState(feed.course_type || '')
  const [elevM, setElevM]         = useState(feed.elevation_m || 0)
  const [avgPow, setAvgPow]       = useState(feed.avg_power_w || 0)
  const [memo, setMemo]           = useState(feed.memo || '')
  const [visibility, setVisibility] = useState(feed.visibility || 'public')
  const [segs, setSegs]           = useState(
    initSegs ? initSegs.map(s => ({ ...s, dur: secsToDur(s.duration_sec) })) : null
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const iSt = { width: '100%', padding: '9px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
  const lSt = { display: 'block', fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }

  function ToggleBtns({ options, value, onChange }) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: value === o.value ? C.accentBg : C.surfaceAlt,
            color: value === o.value ? C.accent : C.text2,
            outline: value === o.value ? `2px solid ${C.accentBorder}` : '2px solid transparent',
          }}>{o.label}</button>
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
        if (feed.sport_type === 'swim')  { body.pool_type = poolType }
        if (feed.sport_type === 'bike')  { body.course_type = courseType; body.elevation_m = Number(elevM); body.avg_power_w = Number(avgPow) }
        if (feed.sport_type === 'run')   { body.elevation_m = Number(elevM); body.course_type = courseType }
      }
      await onSave(feed.id, body)
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', padding: 20, border: `1px solid ${C.border}`, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>
          {SPORT_ICON[feed.sport_type]} {SPORT_LABEL[feed.sport_type]} 기록 수정
        </div>

        {/* 날짜 */}
        <div style={{ marginBottom: 12 }}>
          <label style={lSt}>날짜</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iSt} />
        </div>

        {/* 브릭: 세그먼트별 */}
        {isBrick && segs ? segs.map((s, i) => (
          <div key={i} style={{ background: C.surfaceAlt, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SPORT_COLOR[s.sport] || C.accent, marginBottom: 8 }}>
              {SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
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
          /* 일반 종목: 거리 + 시간 */
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

        {/* 수영: 수영장 종류 */}
        {feed.sport_type === 'swim' && (
          <div style={{ marginBottom: 12 }}>
            <label style={lSt}>수영장 종류</label>
            <ToggleBtns options={[{ value: 'open', label: '오픈워터' }, { value: 'indoor', label: '실내' }]} value={poolType} onChange={setPoolType} />
          </div>
        )}

        {/* 사이클: 코스 + 고도 + 파워 */}
        {feed.sport_type === 'bike' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={lSt}>코스 종류</label>
              <ToggleBtns options={[{ value: 'outdoor', label: '실외' }, { value: 'indoor', label: '실내' }]} value={courseType} onChange={setCourseType} />
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

        {/* 런: 코스 + 고도 */}
        {feed.sport_type === 'run' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={lSt}>코스 종류</label>
              <ToggleBtns options={[{ value: '실외', label: '실외' }, { value: '실내', label: '실내' }]} value={courseType} onChange={setCourseType} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lSt}>획득 고도 (m)</label>
              <input type="number" min={0} value={elevM} onChange={e => setElevM(e.target.value)} style={iSt} />
            </div>
          </>
        )}

        {/* 메모 */}
        <div style={{ marginBottom: 12 }}>
          <label style={lSt}>메모</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
            style={{ ...iSt, resize: 'none' }} />
        </div>

        {/* 공개 범위 */}
        <div style={{ marginBottom: 20 }}>
          <label style={lSt}>공개 범위</label>
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
        </div>

        {err && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.error }}>{err}</div>}

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

function FeedCard({ feed: f, myId, user, onStar, openComments, setOpenComments, onEdit, onDelete, onStatusChange }) {
  const sc = SPORT_COLOR[f.sport_type] || C.accent
  const isOpen = openComments === f.id
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingC, setLoadingC] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [approving, setApproving] = useState(false)
  const [likeList, setLikeList] = useState(null)
  const [loadingLikes, setLoadingLikes] = useState(false)
  const vis = VIS_MAP[f.visibility || 'public']
  const status = f.status || 'approved'
  const canApprove = user?.role === 'admin' || user?.can_approve

  async function handleApprove(newStatus) {
    setApproving(true)
    try {
      await api.setWorkoutStatus(f.id, newStatus)
      onStatusChange(f.id, newStatus)
    } catch (e) { alert(e.message) }
    finally { setApproving(false) }
  }

  async function loadComments() {
    setLoadingC(true)
    const rows = await req('/social/comments/' + f.id)
    setComments(rows); setLoadingC(false)
  }
  async function postComment() {
    if (!commentText.trim()) return
    const body = { body: commentText }
    if (replyingTo) body.parent_id = replyingTo.id
    const row = await req('/social/comments/' + f.id, { method: 'POST', body })
    setComments(prev => [...prev, row])
    setCommentText('')
    setReplyingTo(null)
  }
  async function deleteComment(cid) {
    await req('/social/comments/' + cid, { method: 'DELETE' })
    setComments(prev => prev.filter(cc => cc.id !== cid))
  }
  function toggleComments() {
    if (!isOpen) { setOpenComments(f.id); loadComments() } else setOpenComments(null)
  }

  const segs = f.sport_type === 'brick' ? (() => { try { return JSON.parse(f.brick_segments || '[]') } catch { return [] } })() : null
  const photoList = (() => { try { return JSON.parse(f.photos || '[]') } catch { return [] } })()
  const allPhotos = photoList.length > 0 ? photoList : (f.photo ? [f.photo] : [])
  const coverIdx = f.cover_photo_index || 0
  const [photoModalIdx, setPhotoModalIdx] = useState(null)
  const swipeTouchX = useRef(null)
  const swipeHandled = useRef(false)

  return (
    <div style={{ margin: '0 12px 10px' }}>
      <div style={{ ...cardSport(sc), overflow: 'hidden' }}>
        {/* 작성자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
          <button onClick={() => navigate(`/users/${f.user_id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <Avatar nickname={f.nickname} avatar_color={f.avatar_color} avatar_image={f.avatar_image} size={38} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => navigate(`/users/${f.user_id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: C.text }}>
                {f.nickname}
              </button>
              {f.user_id === myId && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px' }}>나</span>}
            </div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
              {f.logged_at}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{SPORT_ICON[f.sport_type]} {SPORT_LABEL[f.sport_type]}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 6px', background: STATUS_BG[status], color: STATUS_COLOR[status] }}>
                {STATUS_LABEL[status]}
              </span>
              {status === 'pending' && canApprove && !approving && (
                <>
                  <button onClick={() => handleApprove('approved')} style={{ background: C.successBg, border: 'none', borderRadius: 6, color: C.success, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>✓</button>
                  <button onClick={() => handleApprove('rejected')} style={{ background: C.errorBg, border: 'none', borderRadius: 6, color: C.error, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>✕</button>
                </>
              )}
              {(f.user_id === myId || user?.role === 'admin') && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={onEdit} style={{ background: C.surfaceAlt, border: 'none', borderRadius: 6, color: C.text2, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>수정</button>
                  <button onClick={() => onDelete(f.id)} style={{ background: C.errorBg, border: 'none', borderRadius: 6, color: C.error, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>삭제</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사진 모달 */}
        {photoModalIdx !== null && (
          <div
            onClick={() => { if (!swipeHandled.current) setPhotoModalIdx(null) }}
            onTouchStart={e => { swipeTouchX.current = e.touches[0].clientX; swipeHandled.current = false }}
            onTouchEnd={e => {
              if (swipeTouchX.current === null) return
              const dx = e.changedTouches[0].clientX - swipeTouchX.current
              swipeTouchX.current = null
              if (Math.abs(dx) < 50) return
              swipeHandled.current = true
              setPhotoModalIdx(i => dx < 0 ? (i + 1) % allPhotos.length : (i - 1 + allPhotos.length) % allPhotos.length)
            }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={allPhotos[photoModalIdx]} alt="" draggable={false} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} />
            {allPhotos.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); setPhotoModalIdx(i => (i - 1 + allPhotos.length) % allPhotos.length) }}
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer' }}>‹</button>
                <button onClick={e => { e.stopPropagation(); setPhotoModalIdx(i => (i + 1) % allPhotos.length) }}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer' }}>›</button>
                <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {allPhotos.map((_, i) => (
                    <div key={i} onClick={e => { e.stopPropagation(); setPhotoModalIdx(i) }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: i === photoModalIdx ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} />
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setPhotoModalIdx(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* 사진 */}
        {allPhotos.length > 0 && (
          <div style={{ margin: '0 14px 10px' }}>
            {allPhotos.length === 1 ? (
              <img src={allPhotos[0]} alt="훈련 사진" onClick={() => setPhotoModalIdx(0)}
                style={{ width: '100%', borderRadius: 12, display: 'block', maxHeight: 300, objectFit: 'cover', cursor: 'zoom-in' }} />
            ) : (
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderRadius: 12, paddingBottom: 2 }}>
                {allPhotos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={p} alt={`사진 ${i+1}`} onClick={() => setPhotoModalIdx(i)}
                      style={{ width: allPhotos.length === 2 ? 'calc(50vw - 30px)' : 140, height: 160, objectFit: 'cover', borderRadius: 10, display: 'block', cursor: 'zoom-in' }} />
                    {i === coverIdx && (
                      <div style={{ position: 'absolute', top: 5, left: 5, background: C.accent, borderRadius: 4, fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px' }}>대표</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 훈련 내용 */}
        <div style={{ margin: '0 14px 10px', background: `linear-gradient(135deg, ${sc}10 0%, transparent 60%)`, border: `1px solid ${sc}20`, borderRadius: 14, padding: '14px 16px' }}>
          {segs ? (
            segs.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.text2, marginBottom: 5 }}>
                <span>{SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}</span>
                <span style={{ fontWeight: 700, color: C.text }}>{s.distance_km}km · {formatDuration(s.duration_sec)}</span>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <Metric val={f.distance_km} unit="km" />
              <div style={{ width: 1, height: 32, background: C.border }} />
              <Metric val={formatDuration(f.duration_sec)} unit="시간" />
              {f.pace > 0 && <>
                <div style={{ width: 1, height: 32, background: C.border }} />
                <Metric
                  val={f.sport_type === 'bike' ? f.pace.toFixed(1) : (() => { const m = Math.floor(f.pace); const s = Math.round((f.pace-m)*60); return `${m}:${String(s).padStart(2,'0')}` })()}
                  unit={f.sport_type === 'bike' ? 'km/h' : f.sport_type === 'swim' ? '/100m' : '/km'}
                />
              </>}
            </div>
          )}
          {f.memo && <div style={{ marginTop: 10, fontSize: 12, color: C.text2, borderTop: `1px solid ${C.border}`, paddingTop: 10, fontStyle: 'italic' }}>{f.memo}</div>}
        </div>

        {/* 좋아요 목록 팝업 */}
        {likeList !== null && (
          <div onClick={() => setLikeList(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '60vh', display: 'flex', flexDirection: 'column', border: `1px solid ${C.border}` }}>
              <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>⭐ 좋아요 {likeList.length}명</span>
                <button onClick={() => setLikeList(null)} style={{ background: 'none', border: 'none', color: C.text2, fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                {loadingLikes ? (
                  <div style={{ textAlign: 'center', padding: 24, color: C.text2, fontSize: 13 }}>불러오는 중...</div>
                ) : likeList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: C.text2, fontSize: 13 }}>아직 좋아요가 없습니다</div>
                ) : likeList.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px' }}>
                    <Avatar nickname={u.nickname} avatar_color={u.avatar_color} avatar_image={u.avatar_image} size={36} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{u.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 액션 */}
        <div style={{ display: 'flex', padding: '2px 6px 10px', alignItems: 'center' }}>
          <button onClick={onStar} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 8px 7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: f.my_like ? C.gold : C.text2, fontWeight: 700 }}>
            <span style={{ fontSize: 18 }}>{f.my_like ? '⭐' : '☆'}</span>
          </button>
          <button onClick={async () => {
            setLikeList([]); setLoadingLikes(true)
            try { setLikeList(await api.getLikes(f.id)) } finally { setLoadingLikes(false) }
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.text2, fontWeight: 700, padding: '7px 12px 7px 2px' }}>
            {f.like_count || 0}
          </button>
          <button onClick={toggleComments} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: isOpen ? C.accent : C.text2, fontWeight: 700 }}>
            <span style={{ fontSize: 16 }}>💬</span> {f.comment_count || 0}
          </button>
          <div style={{ flex: 1 }} />
        </div>

        {/* 댓글 */}
        {isOpen && (
          <div style={{ background: C.surfaceAlt, borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
            {loadingC ? (
              <div style={{ fontSize: 12, color: C.text2, padding: '4px 0 8px' }}>불러오는 중...</div>
            ) : comments.length === 0 ? (
              <div style={{ fontSize: 12, color: C.text2, padding: '4px 0 8px' }}>첫 댓글을 남겨보세요!</div>
            ) : (() => {
              const topLevel = comments.filter(c => !c.parent_id)
              const repliesByParent = {}
              comments.filter(c => c.parent_id).forEach(c => {
                if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = []
                repliesByParent[c.parent_id].push(c)
              })
              const CommentRow = ({ cc, isReply }) => (
                <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{ width: isReply ? 20 : 24, height: isReply ? 20 : 24, borderRadius: '50%', background: cc.avatar_color+'22', border: `1.5px solid ${cc.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isReply ? 8 : 9, fontWeight: 800, color: cc.avatar_color, flexShrink: 0 }}>
                    {cc.nickname?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginRight: 5 }}>{cc.nickname}</span>
                    <span style={{ fontSize: 12, color: C.text2 }}>{cc.body}</span>
                    {!isReply && (
                      <button onClick={() => { setReplyingTo({ id: cc.id, nickname: cc.nickname }); setCommentText('') }}
                        style={{ display: 'block', background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 0', marginTop: 2 }}>
                        답글
                      </button>
                    )}
                  </div>
                  {cc.user_id === myId && <button onClick={() => deleteComment(cc.id)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 11 }}>✕</button>}
                </div>
              )
              return topLevel.map(cc => (
                <div key={cc.id}>
                  <CommentRow cc={cc} isReply={false} />
                  {(repliesByParent[cc.id] || []).map(r => (
                    <div key={r.id} style={{ marginLeft: 30, borderLeft: `2px solid ${C.border}`, paddingLeft: 10, marginBottom: 2 }}>
                      <CommentRow cc={r} isReply={true} />
                    </div>
                  ))}
                </div>
              ))
            })()}
            {replyingTo && (
              <div style={{ fontSize: 11, color: C.accent, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>↩ {replyingTo.nickname}에게 답글</span>
                <button onClick={() => { setReplyingTo(null); setCommentText('') }} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 11 }}>✕</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()}
                placeholder={replyingTo ? `${replyingTo.nickname}에게 답글...` : '댓글 입력...'}
                style={{ flex: 1, padding: '9px 12px', background: C.surface, border: `1px solid ${replyingTo ? C.accentBorder : C.border}`, borderRadius: 10, color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={postComment} style={{ padding: '9px 14px', background: C.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>전송</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ val, unit }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 9, color: C.text3, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit}</div>
    </div>
  )
}

const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }
