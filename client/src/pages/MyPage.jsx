import { useState, useEffect } from 'react'
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
  const totalSec = stats.reduce((a, s) => a + (s.total_sec || 0), 0)  // 사용 안 함이지만 유지

  return (
    <div style={{ padding: 16 }}>

      {/* 프로필 카드 */}
      <div style={{ background: '#0C1420', borderRadius: 16, padding: 16, border: '1px solid #16202E', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: (user?.avatar_color||'#4DB8FF')+'22', border: `3px solid ${user?.avatar_color||'#4DB8FF'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: user?.avatar_color||'#4DB8FF', flexShrink: 0 }}>
            {user?.nickname?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#E8E6E0', display: 'flex', alignItems: 'center', gap: 6 }}>
              {user?.nickname}
              {user?.role === 'admin' && <span style={{ fontSize: 10, background: 'rgba(255,200,0,0.15)', color: '#FFD700', borderRadius: 5, padding: '2px 6px' }}>👑 관리자</span>}
            </div>
            <div style={{ fontSize: 11, color: '#3A4A5A', marginTop: 3 }}>철인3종 훈련 중</div>
          </div>
          <button onClick={logout} style={{ fontSize: 11, color: '#3A4A5A', background: '#101820', border: '1px solid #1A2230', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>로그아웃</button>
        </div>

        {/* 팔로워/팔로잉 */}
        <div style={{ display: 'flex', gap: 1, borderTop: '1px solid #16202E', paddingTop: 12 }}>
          <button onClick={openFollowers} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#4DB8FF' }}>{profile?.follower_count || 0}</div>
            <div style={{ fontSize: 11, color: '#3A4A5A', marginTop: 2 }}>팔로워</div>
          </button>
          <div style={{ width: 1, background: '#16202E' }} />
          <button onClick={openFollowing} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#4DB8FF' }}>{profile?.following_count || 0}</div>
            <div style={{ fontSize: 11, color: '#3A4A5A', marginTop: 2 }}>팔로잉</div>
          </button>
          <div style={{ width: 1, background: '#16202E' }} />
          <div style={{ flex: 1, textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#4DB8FF' }}>{stats.reduce((a, s) => a + (s.cnt || 0), 0)}</div>
            <div style={{ fontSize: 11, color: '#3A4A5A', marginTop: 2 }}>훈련 횟수</div>
          </div>
        </div>
      </div>

      {/* 종목별 누적 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0', marginBottom: 10 }}>📊 종목별 누적</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {['swim','bike','run'].map(s => (
          <div key={s} style={{ background: '#0C1420', borderRadius: 12, padding: 12, border: `1px solid ${SPORT_COLOR[s]}33`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{SPORT_ICON[s]}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: SPORT_COLOR[s] }}>{(byType[s]||0).toFixed(1)}</div>
            <div style={{ fontSize: 9, color: '#3A4A5A' }}>km</div>
          </div>
        ))}
      </div>

      {/* 최근 훈련 */}
      {profile?.recentWorkouts?.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0', marginBottom: 10 }}>🕐 최근 훈련</div>
          {profile.recentWorkouts.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0E1520' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: SPORT_COLOR[w.sport_type]+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{SPORT_ICON[w.sport_type]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: SPORT_COLOR[w.sport_type] }}>{SPORT_LABEL[w.sport_type]}</div>
                <div style={{ fontSize: 11, color: '#4A5A6A' }}>{w.distance_km}km · {formatDuration(w.duration_sec)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4DB8FF' }}>{(w.score||0).toFixed(1)}pt</div>
                <div style={{ fontSize: 10, color: '#3A4A5A' }}>{w.logged_at}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* 팔로워 모달 */}
      {showFollowers && <FollowModal title="팔로워" list={followerList} myId={user?.id} onToggle={toggleFollow} onClose={() => setShowFollowers(false)} />}
      {showFollowing && <FollowModal title="팔로잉" list={followingList} myId={user?.id} onToggle={toggleFollow} onClose={() => setShowFollowing(false)} />}
    </div>
  )
}

function FollowModal({ title, list, myId, onToggle, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#0C1420', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '70vh', overflow: 'auto', padding: '0 0 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: '1px solid #16202E' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#E8E6E0' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A5A6A', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        {list.length === 0
          ? <div style={{ textAlign: 'center', padding: 32, color: '#3A4A5A', fontSize: 13 }}>아직 없습니다.</div>
          : list.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #0E1520' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_color+'22', border: `2px solid ${u.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: u.avatar_color }}>
                {u.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#E8E6E0' }}>{u.nickname}</div>
              {u.id !== myId && (
                <button onClick={() => onToggle(u.id, u.i_follow)} style={{
                  padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: u.i_follow ? '#1A2A3E' : '#4DB8FF',
                  color: u.i_follow ? '#4DB8FF' : '#080B10',
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
