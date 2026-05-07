import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

export default function UserProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    req('/social/profile/' + id)
      .then(data => {
        setProfile(data)
        setFollowing(!!data.i_follow)
        setFollowerCount(data.follower_count || 0)
      })
      .finally(() => setLoading(false))
  }, [id])

  async function toggleFollow() {
    if (following) {
      await req('/social/follow/' + id, { method: 'DELETE' })
      setFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await req('/social/follow/' + id, { method: 'POST' })
      setFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: C.text2 }}>⏳ 불러오는 중...</div>
  if (!profile) return <div style={{ textAlign: 'center', padding: 60, color: C.text2 }}>존재하지 않는 회원입니다.</div>

  const { user, stats = [], recentWorkouts = [] } = profile
  const isSelf = me?.id === Number(id)

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* 헤더 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>프로필</span>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        {/* 프로필 카드 */}
        <div style={{ background: C.surface, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar nickname={user.nickname} avatar_color={user.avatar_color} avatar_image={user.avatar_image} size={64} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{user.nickname}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 3 }}>가입 {user.created_at?.slice(0,10)}</div>
            </div>
            {!isSelf && (
              <button onClick={toggleFollow} style={{
                padding: '8px 18px', border: 'none', borderRadius: 100, cursor: 'pointer',
                background: following ? C.surfaceHigh : C.accent,
                color: following ? C.text2 : '#fff',
                fontSize: 13, fontWeight: 700,
              }}>
                {following ? '팔로잉' : '팔로우'}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{followerCount}</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>팔로워</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{profile.following_count || 0}</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>팔로잉</div>
            </div>
          </div>
        </div>

        {/* 종목별 통계 */}
        {stats.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>훈련 통계</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
              {stats.map(s => (
                <div key={s.sport_type} style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', borderLeft: `3px solid ${SPORT_COLOR[s.sport_type]}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: SPORT_COLOR[s.sport_type], marginBottom: 4, textTransform: 'uppercase' }}>
                    {SPORT_ICON[s.sport_type]} {SPORT_LABEL[s.sport_type]}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{Number(s.km||0).toFixed(1)}<span style={{ fontSize: 11, color: C.text3, fontWeight: 500, marginLeft: 2 }}>km</span></div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{s.cnt}회 훈련</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 최근 기록 */}
        {recentWorkouts.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>최근 훈련</div>
            {recentWorkouts.map(w => (
              <div key={w.id} style={{ background: C.surface, borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderLeft: `3px solid ${SPORT_COLOR[w.sport_type]}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: SPORT_COLOR[w.sport_type]+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {SPORT_ICON[w.sport_type]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: SPORT_COLOR[w.sport_type] }}>{SPORT_LABEL[w.sport_type]}</div>
                    <div style={{ fontSize: 11, color: C.text2 }}>{formatDuration(w.duration_sec)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{(w.distance_km||0).toFixed(2)}km</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{w.logged_at}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {stats.length === 0 && recentWorkouts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: C.text2, fontSize: 13 }}>아직 공개된 훈련 기록이 없습니다.</div>
        )}
      </div>
    </div>
  )
}
