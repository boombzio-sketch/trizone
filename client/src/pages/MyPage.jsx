import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'
import { C } from '../utils/theme'

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

export default function MyPage() {
  const { user, logout } = useAuth()
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
  const byType = { swim: 0, bike: 0, run: 0 }
  stats.forEach(s => { if (byType[s.sport_type] !== undefined) byType[s.sport_type] = s.km || 0 })

  return (
    <div style={{ padding: 14 }}>
      {/* 프로필 카드 */}
      <div style={{ background: C.surface, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: (user?.avatar_color||C.accent)+'22', border: `3px solid ${user?.avatar_color||C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: user?.avatar_color||C.accent, flexShrink: 0 }}>
            {user?.nickname?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 7 }}>
              {user?.nickname}
              {user?.role === 'admin' && <span style={{ fontSize: 10, background: C.goldBg, color: C.gold, borderRadius: 6, padding: '2px 7px' }}>👑 관리자</span>}
            </div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>철인3종 훈련 중</div>
          </div>
          <button onClick={logout} style={{ fontSize: 12, color: C.text2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>로그아웃</button>
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

      {/* 종목별 누적 */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>종목별 누적</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
        {['swim','bike','run'].map(s => (
          <div key={s} style={{ background: C.surface, borderRadius: 14, padding: '14px 10px', borderLeft: `3px solid ${SPORT_COLOR[s]}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{SPORT_ICON[s]}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: SPORT_COLOR[s], fontVariantNumeric: 'tabular-nums' }}>{(byType[s]||0).toFixed(1)}</div>
            <div style={{ fontSize: 9, color: C.text3, marginTop: 2, textTransform: 'uppercase' }}>km</div>
          </div>
        ))}
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
                <div style={{ fontSize: 11, color: C.text2 }}>{w.distance_km}km · {formatDuration(w.duration_sec)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>{(w.score||0).toFixed(1)}pt</div>
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
