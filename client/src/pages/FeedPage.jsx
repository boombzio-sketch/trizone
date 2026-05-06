import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'

const BASE = '/api'
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

export default function FeedPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('following') // following | all
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [openComments, setOpenComments] = useState(null) // workout_id
  const searchTimer = useRef(null)

  useEffect(() => { loadFeed() }, [tab])

  async function loadFeed() {
    setLoading(true)
    try {
      const path = tab === 'following' ? '/social/feed' : '/social/feed/all'
      const rows = await req(path)
      setFeeds(rows)
    } finally { setLoading(false) }
  }

  // 유저 검색
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchQ.trim()) { setSearchRes([]); return }
    searchTimer.current = setTimeout(async () => {
      const rows = await req('/social/users/search?q=' + encodeURIComponent(searchQ))
      setSearchRes(rows)
    }, 300)
  }, [searchQ])

  async function toggleLike(workoutId) {
    const data = await req('/social/like/' + workoutId, { method: 'POST' })
    setFeeds(prev => prev.map(f =>
      f.id === workoutId
        ? { ...f, like_count: data.count, my_like: data.liked ? 1 : null }
        : f
    ))
  }

  async function toggleFollow(targetId, isFollowing) {
    if (isFollowing) {
      await req('/social/follow/' + targetId, { method: 'DELETE' })
    } else {
      await req('/social/follow/' + targetId, { method: 'POST' })
    }
    setSearchRes(prev => prev.map(u =>
      u.id === targetId ? { ...u, i_follow: isFollowing ? 0 : 1 } : u
    ))
  }

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* 헤더 */}
      <div style={{ background: '#0C1420', borderBottom: '1px solid #16202E', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {[['following','팔로잉'],['all','전체']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 20,
              background: tab===k ? '#4DB8FF' : '#101820',
              color: tab===k ? '#080B10' : '#4A5A6A',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
        <button onClick={() => setShowSearch(s => !s)} style={{
          background: showSearch ? '#1A2A3E' : '#101820', border: '1px solid #1E2A3A',
          borderRadius: 8, padding: '6px 10px', color: '#4DB8FF', fontSize: 14, cursor: 'pointer',
        }}>🔍</button>
      </div>

      {/* 검색 패널 */}
      {showSearch && (
        <div style={{ background: '#0C1420', borderBottom: '1px solid #16202E', padding: '10px 14px' }}>
          <input
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="닉네임으로 검색..."
            style={{ width: '100%', padding: '9px 12px', background: '#080B10', border: '1px solid #1E2A3A', borderRadius: 10, color: '#E8E6E0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
          {searchRes.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: '1px solid #0E1520' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatar_color+'22', border: `2px solid ${u.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: u.avatar_color }}>
                {u.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0' }}>{u.nickname}</div>
                <div style={{ fontSize: 10, color: '#3A4A5A' }}>팔로워 {u.follower_count}명</div>
              </div>
              {u.id !== user?.id && (
                <button onClick={() => toggleFollow(u.id, u.i_follow)} style={{
                  padding: '5px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: u.i_follow ? '#1A2A3E' : '#4DB8FF',
                  color: u.i_follow ? '#4DB8FF' : '#080B10',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {u.i_follow ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 피드 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#3A4A5A' }}>⏳ 로딩 중...</div>
      ) : feeds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#3A4A5A', fontSize: 14, lineHeight: 1.8 }}>
          {tab === 'following'
            ? '아직 팔로우한 사람이 없어요.\n🔍 검색으로 클럽원을 찾아 팔로우해보세요!'
            : '아직 훈련 기록이 없습니다.'
          }
        </div>
      ) : feeds.map(f => (
        <FeedCard
          key={f.id}
          feed={f}
          myId={user?.id}
          onLike={() => toggleLike(f.id)}
          openComments={openComments}
          setOpenComments={setOpenComments}
        />
      ))}
    </div>
  )
}

function FeedCard({ feed: f, myId, onLike, openComments, setOpenComments }) {
  const c = SPORT_COLOR[f.sport_type] || '#4DB8FF'
  const isOpen = openComments === f.id
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingC, setLoadingC] = useState(false)

  async function loadComments() {
    setLoadingC(true)
    const rows = await req('/social/comments/' + f.id)
    setComments(rows)
    setLoadingC(false)
  }

  async function postComment() {
    if (!commentText.trim()) return
    const row = await req('/social/comments/' + f.id, { method: 'POST', body: { body: commentText } })
    setComments(prev => [...prev, row])
    setCommentText('')
  }

  async function deleteComment(cid) {
    await req('/social/comments/' + cid, { method: 'DELETE' })
    setComments(prev => prev.filter(c => c.id !== cid))
  }

  function toggleComments() {
    if (!isOpen) { setOpenComments(f.id); loadComments() }
    else setOpenComments(null)
  }

  const segs = f.sport_type === 'brick' ? (() => { try { return JSON.parse(f.brick_segments || '[]') } catch { return [] } })() : null

  return (
    <div style={{ borderBottom: '1px solid #0E1520', background: '#080B10' }}>
      {/* 작성자 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: f.avatar_color+'22', border: `2px solid ${f.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: f.avatar_color, flexShrink: 0 }}>
          {f.nickname?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0', display: 'flex', alignItems: 'center', gap: 6 }}>
            {f.nickname}
            {f.user_id === myId && <span style={{ fontSize: 9, background: 'rgba(77,184,255,0.15)', color: '#4DB8FF', borderRadius: 4, padding: '1px 5px' }}>나</span>}
          </div>
          <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 1 }}>{f.logged_at}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: c+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {SPORT_ICON[f.sport_type]}
        </div>
      </div>

      {/* 훈련 내용 */}
      <div style={{ margin: '0 14px 10px', background: '#0C1420', borderRadius: 12, padding: '12px 14px', border: `1px solid ${c}33` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 8 }}>
          {SPORT_LABEL[f.sport_type]} 훈련
        </div>
        {segs ? (
          <div>
            {segs.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8A9AAA', marginBottom: 3 }}>
                <span>{SPORT_ICON[s.sport]} {SPORT_LABEL[s.sport]}</span>
                <span style={{ fontWeight: 700 }}>{s.distance_km}km · {formatDuration(s.duration_sec)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#E8E6E0' }}>{f.distance_km}</div>
              <div style={{ fontSize: 9, color: '#3A4A5A', marginTop: 1 }}>km</div>
            </div>
            <div style={{ width: 1, background: '#1A2230' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#E8E6E0' }}>{formatDuration(f.duration_sec)}</div>
              <div style={{ fontSize: 9, color: '#3A4A5A', marginTop: 1 }}>시간</div>
            </div>
            {f.pace > 0 && (
              <>
                <div style={{ width: 1, background: '#1A2230' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#E8E6E0' }}>
                    {f.sport_type === 'bike' ? f.pace.toFixed(1) : (() => { const m = Math.floor(f.pace); const s = Math.round((f.pace-m)*60); return `${m}:${String(s).padStart(2,'0')}` })()}
                  </div>
                  <div style={{ fontSize: 9, color: '#3A4A5A', marginTop: 1 }}>
                    {f.sport_type === 'bike' ? 'km/h' : f.sport_type === 'swim' ? '/100m' : '/km'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {f.memo ? (
          <div style={{ marginTop: 8, fontSize: 12, color: '#5A6A7A', fontStyle: 'italic', borderTop: '1px solid #1A2230', paddingTop: 8 }}>
            {f.memo}
          </div>
        ) : null}
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 0, padding: '0 8px 10px' }}>
        <button onClick={onLike} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: f.my_like ? '#FF5080' : '#4A5A6A', fontWeight: 700,
        }}>
          <span style={{ fontSize: 16 }}>{f.my_like ? '❤️' : '🤍'}</span>
          {f.like_count || 0}
        </button>
        <button onClick={toggleComments} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: isOpen ? '#4DB8FF' : '#4A5A6A', fontWeight: 700,
        }}>
          <span style={{ fontSize: 16 }}>💬</span>
          {f.comment_count || 0}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#2A3A4A', padding: '7px 10px', fontWeight: 600 }}>
          {(f.score || 0).toFixed(1)}pt
        </div>
      </div>

      {/* 댓글 영역 */}
      {isOpen && (
        <div style={{ background: '#0A1018', borderTop: '1px solid #12192A', padding: '10px 14px' }}>
          {loadingC ? (
            <div style={{ fontSize: 12, color: '#3A4A5A', padding: '8px 0' }}>댓글 불러오는 중...</div>
          ) : comments.length === 0 ? (
            <div style={{ fontSize: 12, color: '#3A4A5A', padding: '4px 0 8px' }}>첫 댓글을 남겨보세요!</div>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.avatar_color+'22', border: `1.5px solid ${c.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: c.avatar_color, flexShrink: 0 }}>
                {c.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4DB8FF', marginRight: 6 }}>{c.nickname}</span>
                <span style={{ fontSize: 12, color: '#8A9AAA' }}>{c.body}</span>
              </div>
              {(c.user_id === myId) && (
                <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#2A3A4A', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
              )}
            </div>
          ))}
          {/* 댓글 입력 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postComment()}
              placeholder="댓글 입력..."
              style={{ flex: 1, padding: '8px 10px', background: '#0C1420', border: '1px solid #1E2A3A', borderRadius: 8, color: '#E8E6E0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={postComment} style={{ padding: '8px 12px', background: '#4DB8FF', border: 'none', borderRadius: 8, color: '#080B10', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
