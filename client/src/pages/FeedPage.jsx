import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'
import { C } from '../utils/theme'
import { api } from '../utils/api'

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
const VIS_MAP = Object.fromEntries(VIS_OPTIONS.map(v => [v.key, v]))

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('following')
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [openComments, setOpenComments] = useState(null)
  const [editingFeed, setEditingFeed] = useState(null)
  const searchTimer = useRef(null)

  useEffect(() => { loadFeed() }, [tab])

  async function loadFeed() {
    setLoading(true)
    try {
      const path = tab === 'following' ? '/social/feed' : tab === 'club' ? '/social/feed/club' : '/social/feed/all'
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

  async function handleEditSave(id, memo, visibility) {
    const updated = await api.editWorkout(id, { memo, visibility })
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, memo: updated.memo, visibility: updated.visibility } : f))
    setEditingFeed(null)
  }

  const TABS = [
    { key: 'following', label: '팔로잉' },
    { key: 'club',      label: '클럽' },
    { key: 'all',       label: '전체' },
  ]

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_color+'22', border: `2px solid ${u.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: u.avatar_color }}>
                {u.nickname?.charAt(0)}
              </div>
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
            {tab === 'following' ? '아직 팔로우한 사람이 없어요.' : tab === 'club' ? '클럽 회원의 기록이 없습니다.' : '아직 훈련 기록이 없습니다.'}
          </div>
        ) : feeds.map(f => (
          <FeedCard
            key={f.id} feed={f} myId={user?.id}
            onStar={() => toggleStar(f.id)}
            openComments={openComments} setOpenComments={setOpenComments}
            onEdit={() => setEditingFeed(f)}
          />
        ))}
      </div>
    </div>
  )
}

function EditModal({ feed, onSave, onClose }) {
  const [memo, setMemo] = useState(feed.memo || '')
  const [visibility, setVisibility] = useState(feed.visibility || 'public')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try { await onSave(feed.id, memo, visibility) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', padding: 20, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>피드 수정</div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>메모</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3}
            style={{ width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelSt}>공개 범위</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {VIS_OPTIONS.map(v => (
              <button key={v.key} type="button" onClick={() => setVisibility(v.key)} style={{
                padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                background: visibility === v.key ? v.color + '20' : C.surfaceAlt,
                outline: visibility === v.key ? `2px solid ${v.color}` : '2px solid transparent',
                color: visibility === v.key ? v.color : C.text2,
                fontSize: 11, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}>
                <span style={{ fontSize: 18 }}>{v.icon}</span>{v.label}
              </button>
            ))}
          </div>
        </div>

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

function FeedCard({ feed: f, myId, onStar, openComments, setOpenComments, onEdit }) {
  const sc = SPORT_COLOR[f.sport_type] || C.accent
  const isOpen = openComments === f.id
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingC, setLoadingC] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null) // { id, nickname }
  const vis = VIS_MAP[f.visibility || 'public']
  const status = f.status || 'approved'

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

  return (
    <div style={{ margin: '0 12px 10px' }}>
      <div style={{ background: C.surface, borderRadius: 18, overflow: 'hidden', borderLeft: `4px solid ${sc}` }}>
        {/* 작성자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: f.avatar_color+'22', border: `2px solid ${f.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: f.avatar_color, flexShrink: 0 }}>
            {f.nickname?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.nickname}
              {f.user_id === myId && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px' }}>나</span>}
            </div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              {f.logged_at}
              <span style={{ color: vis.color }}>{vis.icon} {vis.label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{SPORT_ICON[f.sport_type]} {SPORT_LABEL[f.sport_type]}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 6px', background: STATUS_BG[status], color: STATUS_COLOR[status] }}>
                {STATUS_LABEL[status]}
              </span>
              {f.user_id === myId && (
                <button onClick={onEdit} style={{ background: C.surfaceAlt, border: 'none', borderRadius: 6, color: C.text2, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>수정</button>
              )}
            </div>
          </div>
        </div>

        {/* 사진 모달 */}
        {photoModalIdx !== null && (
          <div onClick={() => setPhotoModalIdx(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={allPhotos[photoModalIdx]} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
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
        <div style={{ margin: '0 14px 10px', background: C.surfaceAlt, borderRadius: 14, padding: '14px 16px' }}>
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

        {/* 액션 */}
        <div style={{ display: 'flex', padding: '2px 6px 10px', alignItems: 'center' }}>
          <button onClick={onStar} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: f.my_like ? C.gold : C.text2, fontWeight: 700 }}>
            <span style={{ fontSize: 18 }}>{f.my_like ? '⭐' : '☆'}</span> {f.like_count || 0}
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
