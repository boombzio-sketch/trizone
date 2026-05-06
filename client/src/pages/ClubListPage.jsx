import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const REGIONS = ['전체','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']

export default function ClubListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clubs, setClubs] = useState([])
  const [myClubs, setMyClubs] = useState([])
  const [filterMode, setFilterMode] = useState('my') // 'my' | 'region'
  const [region, setRegion] = useState('전체')
  const [loading, setLoading] = useState(true)
  const [leaderApp, setLeaderApp] = useState(null)
  const [myClub, setMyClub] = useState(null)
  const [showLeaderForm, setShowLeaderForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [leaderMsg, setLeaderMsg] = useState('')
  const [createForm, setCreateForm] = useState({ name: '', description: '', region: '서울' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (filterMode === 'region') loadClubs() }, [region, filterMode])

  async function loadAll() {
    try {
      const [myClubsData, leaderData] = await Promise.all([
        api.getMyClubs(),
        api.getMyLeaderApp(),
      ])
      setLeaderApp(leaderData.application)
      setMyClub(leaderData.club)
      // 가입 클럽이 1개면 바로 이동
      if (myClubsData.length === 1) {
        navigate(`/clubs/${myClubsData[0].id}`, { replace: true })
        return
      }
      setMyClubs(myClubsData)
    } finally { setLoading(false) }
  }

  async function loadClubs() {
    const data = await api.getClubs(region)
    setClubs(data)
  }

  async function handleLeaderApply() {
    setSubmitting(true); setError('')
    try {
      await api.applyClubLeader(leaderMsg)
      setSuccess('클럽장 신청이 접수되었습니다. 관리자 승인을 기다려주세요.')
      setShowLeaderForm(false)
      setLeaderApp({ status: 'pending' })
    } catch(e) { setError(e.message) }
    finally { setSubmitting(false) }
  }

  async function handleCreateClub(e) {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const club = await api.createClub(createForm)
      setMyClub(club)
      setShowCreateForm(false)
      setClubs(prev => [...prev, club].sort((a,b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name)))
      navigate(`/clubs/${club.id}`)
    } catch(e) { setError(e.message) }
    finally { setSubmitting(false) }
  }

  const isApprovedLeader = user?.role === 'admin' || leaderApp?.status === 'approved'
  const canCreateClub = isApprovedLeader && !myClub

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>👥 클럽</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>전국 트라이애슬론 클럽</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canCreateClub && (
              <button onClick={() => { setShowCreateForm(s => !s); setError('') }} style={{
                padding: '7px 14px', border: 'none', borderRadius: 100,
                background: showCreateForm ? C.surfaceAlt : C.accent,
                color: showCreateForm ? C.text2 : '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                {showCreateForm ? '취소' : '+ 클럽 만들기'}
              </button>
            )}
            {!isApprovedLeader && (!leaderApp || leaderApp?.status === 'rejected') && user?.role !== 'admin' && (
              <button onClick={() => { setShowLeaderForm(s => !s); setError('') }} style={{
                padding: '7px 14px', border: 'none', borderRadius: 100,
                background: showLeaderForm ? C.surfaceAlt : C.surfaceHigh,
                color: showLeaderForm ? C.text2 : C.text,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${C.border}`,
              }}>
                {showLeaderForm ? '취소' : '클럽장 신청'}
              </button>
            )}
          </div>
        </div>

        {/* 필터 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setFilterMode('my')} style={{
            padding: '7px 16px', border: 'none', borderRadius: 100, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            background: filterMode === 'my' ? C.accent : C.surfaceAlt,
            color: filterMode === 'my' ? '#fff' : C.text2,
            fontSize: 12, fontWeight: 700,
          }}>내 클럽</button>
          <select
            value={filterMode === 'region' ? region : ''}
            onChange={e => { setFilterMode('region'); setRegion(e.target.value) }}
            onClick={() => { if (filterMode !== 'region') { setFilterMode('region'); loadClubs() } }}
            style={{
              flex: 1, padding: '7px 12px', background: filterMode === 'region' ? C.accentBg : C.surfaceAlt,
              border: `1px solid ${filterMode === 'region' ? C.accentBorder : C.border}`,
              borderRadius: 10, color: filterMode === 'region' ? C.accent : C.text2,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none',
              appearance: 'none', backgroundImage: 'none',
            }}
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* 클럽장 신청 폼 */}
      {showLeaderForm && (
        <div style={{ margin: '12px', background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>클럽장 신청</div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 12 }}>관리자 승인 후 클럽을 만들 수 있습니다.</div>
          {leaderApp?.status === 'pending' ? (
            <div style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.warn }}>
              ⏳ 클럽장 신청이 접수되었습니다. 관리자 승인을 기다려주세요.
            </div>
          ) : leaderApp?.status === 'rejected' ? (
            <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.error, marginBottom: 12 }}>
              이전 신청이 거절되었습니다. 다시 신청할 수 있습니다.
            </div>
          ) : null}
          {leaderApp?.status !== 'pending' && (
            <>
              <textarea value={leaderMsg} onChange={e => setLeaderMsg(e.target.value)} placeholder="신청 사유 (간단한 소개)" rows={3}
                style={{ width: '100%', padding: '10px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none', marginBottom: 10 }} />
              {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: C.error }}>{error}</div>}
              <button onClick={handleLeaderApply} disabled={submitting} style={{ width: '100%', padding: '11px', border: 'none', borderRadius: 10, background: submitting ? C.surfaceHigh : C.accent, color: submitting ? C.text2 : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? '신청 중...' : '🙋 클럽장 신청하기'}
              </button>
            </>
          )}
        </div>
      )}

      {/* 클럽 만들기 폼 */}
      {showCreateForm && (
        <form onSubmit={handleCreateClub} style={{ margin: '12px', background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14 }}>새 클럽 만들기</div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>클럽명 *</label>
            <input value={createForm.name} onChange={e => setCreateForm(p => ({...p, name: e.target.value}))} placeholder="예: 트라이클럽" required style={iSt} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>지역 *</label>
            <select value={createForm.region} onChange={e => setCreateForm(p => ({...p, region: e.target.value}))} style={{ ...iSt, cursor: 'pointer' }}>
              {REGIONS.filter(r => r !== '전체').map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>클럽 소개</label>
            <textarea value={createForm.description} onChange={e => setCreateForm(p => ({...p, description: e.target.value}))} placeholder="클럽을 소개해주세요" rows={2} style={{ ...iSt, resize: 'none' }} />
          </div>
          {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: C.error }}>{error}</div>}
          <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 10, background: submitting ? C.surfaceHigh : C.accent, color: submitting ? C.text2 : '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            {submitting ? '생성 중...' : '🏊 클럽 만들기'}
          </button>
        </form>
      )}

      {/* 클럽장 신청 안내 */}
      {leaderApp?.status === 'approved' && myClub && (
        <div style={{ margin: '12px 12px 0', background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 12, padding: '10px 14px', fontSize: 12, color: C.success }}>
          ✅ 내 클럽: <strong>{myClub.name}</strong> — <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/clubs/${myClub.id}`)}>관리하기 →</span>
        </div>
      )}

      {success && (
        <div style={{ margin: '12px', background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: C.success }}>{success}</div>
      )}

      {/* 클럽 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
      ) : filterMode === 'my' && myClubs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>가입된 클럽이 없습니다</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>지역을 선택해 클럽을 찾아보세요</div>
        </div>
      ) : filterMode === 'region' && clubs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{region === '전체' ? '등록된 클럽이 없습니다' : `${region}에 등록된 클럽이 없습니다`}</div>
        </div>
      ) : (
        <div style={{ padding: '10px 12px' }}>
          {(filterMode === 'my' ? myClubs : clubs).map(club => (
            <div key={club.id} onClick={() => navigate(`/clubs/${club.id}`)}
              style={{ background: C.surface, borderRadius: 16, marginBottom: 10, padding: '14px 16px', cursor: 'pointer', border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: C.accentBg, color: C.accent, borderRadius: 6, padding: '2px 8px' }}>{club.region}</span>
                    {club.leader_id === user?.id && <span style={{ fontSize: 10, fontWeight: 700, background: C.goldBg, color: C.gold, borderRadius: 6, padding: '2px 8px' }}>내 클럽</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{club.name}</div>
                  {club.description && <div style={{ fontSize: 12, color: C.text2, marginTop: 3 }}>{club.description}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>{club.member_count}</div>
                  <div style={{ fontSize: 9, color: C.text3 }}>회원</div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: (club.leader_color||C.accent)+'22', border: `1.5px solid ${club.leader_color||C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: club.leader_color||C.accent }}>
                  {club.leader_name?.charAt(0)}
                </div>
                <span style={{ fontSize: 11, color: C.text2 }}>클럽장 {club.leader_name}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: C.text3 }}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const iSt = { width: '100%', padding: '10px 12px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
