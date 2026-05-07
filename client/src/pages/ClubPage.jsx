import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const BASE = (import.meta.env.VITE_API_URL || '') + '/api'
function getToken() { return localStorage.getItem('tz_token') }
async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...options.headers },
    ...options, body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.')
  return data
}

function seenKey(userId, tab) { return `club_seen_${userId}_${tab}` }
function getLastSeen(userId, tab) {
  const s = localStorage.getItem(seenKey(userId, tab))
  return s ? new Date(s) : new Date(0)
}
function markSeen(userId, tab) {
  localStorage.setItem(seenKey(userId, tab), new Date().toISOString())
}

export default function ClubPage() {
  const { user } = useAuth()
  const [membership, setMembership] = useState(null)
  const [loadingMembership, setLoadingMembership] = useState(true)

  useEffect(() => {
    api.getMyMembership()
      .then(setMembership)
      .finally(() => setLoadingMembership(false))
  }, [])

  if (loadingMembership) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳</div>

  if (user?.role === 'admin' || membership?.status === 'approved') {
    return <ClubContent user={user} membership={membership} onLeave={() => setMembership({ status: 'left' })} />
  }
  if (membership?.status === 'pending') return <PendingView />
  return <JoinView status={membership?.status} onJoined={() => setMembership({ status: 'pending' })} />
}

// ── 가입 신청 화면 ──────────────────────────────────
function JoinView({ status, onJoined }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setLoading(true); setError('')
    try { await api.joinClub(message); onJoined() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 20, padding: 24, border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏊🚴🏃</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>클럽에 가입해보세요</div>
        <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 24 }}>
          가입 신청 후 클럽장 승인을 받으면<br />클럽 기록과 랭킹에 참여할 수 있습니다.
        </div>
        {status === 'rejected' && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.error }}>
            이전 가입 신청이 거절되었습니다. 다시 신청할 수 있습니다.
          </div>
        )}
        {status === 'left' && (
          <div style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.warn }}>
            클럽을 탈퇴했습니다. 재가입 신청이 가능합니다.
          </div>
        )}
        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          <label style={labelSt}>가입 인사 (선택)</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="간단한 자기소개를 남겨보세요." rows={3}
            style={{ width: '100%', padding: '12px 14px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none' }} />
        </div>
        {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.error }}>{error}</div>}
        <button onClick={handleJoin} disabled={loading} style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 14, background: loading ? C.surfaceHigh : C.accent, color: loading ? C.text2 : '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer' }}>
          {loading ? '신청 중...' : '🙋 가입 신청하기'}
        </button>
      </div>
    </div>
  )
}

function PendingView() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 20, padding: 32, border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 10 }}>승인 대기 중</div>
        <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.8 }}>
          가입 신청이 접수되었습니다.<br />클럽장이 승인하면 클럽 활동을 시작할 수 있습니다.
        </div>
        <div style={{ marginTop: 24, padding: '12px 16px', background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 12, fontSize: 12, color: C.warn }}>
          승인 전에도 훈련 기록은 입력 가능합니다.
        </div>
      </div>
    </div>
  )
}

// ── 클럽 메인 화면 ─────────────────────────────────
function ClubContent({ user, membership, onLeave }) {
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState('ann')
  const [badges, setBadges] = useState({ ann: 0, training: 0, members: 0, manage: 0 })

  const [clubInfo, setClubInfo]   = useState(null)
  const [members, setMembers]     = useState([])
  const [announcements, setAnn]   = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [pending, setPending]     = useState([])

  const [showEditClub, setShowEditClub] = useState(false)
  const [editName, setEditName]   = useState('')
  const [editDesc, setEditDesc]   = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg]     = useState('')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leavingLoading, setLeavingLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const fetches = [
      req('/club/info'), req('/club/members'),
      req('/club/announcements'), req('/ranking/dashboard'),
    ]
    if (isAdmin) fetches.push(req('/admin/memberships'))
    const [c, m, a, d, p = []] = await Promise.all(fetches)
    setClubInfo(c); setMembers(m); setAnn(a); setDashboard(d); setPending(p)
    calcBadges(a, m, d?.heatmap || [], p)
  }

  function calcBadges(anns, mems, heatmap, pend) {
    const lastAnn      = getLastSeen(user.id, 'ann')
    const lastMembers  = getLastSeen(user.id, 'members')
    const lastTraining = getLastSeen(user.id, 'training')

    const badgeAnn  = anns.filter(a => new Date(a.created_at) > lastAnn).length
    const badgeMem  = mems.filter(m => new Date(m.created_at) > lastMembers).length

    const newPairs = new Set()
    heatmap.forEach(row => {
      if (row.logged_at && new Date(row.logged_at) > lastTraining)
        newPairs.add(`${row.user_id}_${row.logged_at}`)
    })

    setBadges({ ann: badgeAnn, training: newPairs.size, members: badgeMem, manage: pend.length })
  }

  function selectTab(key) {
    setTab(key)
    markSeen(user.id, key)
    setBadges(prev => ({ ...prev, [key]: 0 }))
  }

  function openEdit() { setEditName(clubInfo?.name || ''); setEditDesc(clubInfo?.description || ''); setEditMsg(''); setShowEditClub(true) }

  async function saveClub() {
    if (!editName.trim()) { setEditMsg('클럽명을 입력하세요.'); return }
    setEditSaving(true); setEditMsg('')
    try {
      await req('/club/info', { method: 'PUT', body: { name: editName.trim(), description: editDesc.trim() } })
      setClubInfo(await req('/club/info'))
      setEditMsg('✅ 저장됐습니다!')
      setTimeout(() => setShowEditClub(false), 900)
    } catch (e) { setEditMsg('❌ ' + e.message) }
    finally { setEditSaving(false) }
  }

  async function handleLeave() {
    setLeavingLoading(true)
    try { await api.leaveClub(); onLeave() }
    catch (e) { alert(e.message) }
    finally { setLeavingLoading(false) }
  }

  const tabs = [
    { key: 'ann',      label: '공지사항' },
    { key: 'training', label: '훈련' },
    { key: 'members',  label: '회원' },
    ...(isAdmin ? [{ key: 'manage', label: '관리' }] : []),
  ]

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* 클럽 헤더 */}
      {clubInfo && (
        <div style={{ background: `linear-gradient(135deg, ${C.surfaceHigh}, ${C.surface})`, padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{clubInfo.name}</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{clubInfo.description || '소개 없음'} · 회원 {clubInfo.member_count}명</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isAdmin && <button onClick={openEdit} style={{ fontSize: 11, fontWeight: 700, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '7px 12px', cursor: 'pointer' }}>✏️ 수정</button>}
              {!isAdmin && <button onClick={() => setShowLeaveConfirm(true)} style={{ fontSize: 11, fontWeight: 700, background: C.errorBg, color: C.error, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '7px 12px', cursor: 'pointer' }}>탈퇴</button>}
            </div>
          </div>
        </div>
      )}

      {/* 탭 바 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex' }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => selectTab(key)} style={{
            flex: 1, padding: '11px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, position: 'relative',
            color: tab === key ? C.accent : C.text2,
            borderBottom: tab === key ? `2px solid ${C.accent}` : '2px solid transparent',
          }}>
            {label}
            {badges[key] > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 8, background: '#ef4444', color: '#fff', verticalAlign: 'middle' }}>
                {badges[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {tab === 'ann'      && <AnnTab announcements={announcements} setAnn={setAnn} user={user} />}
      {tab === 'training' && <TrainingTab dashboard={dashboard} members={members} user={user} />}
      {tab === 'members'  && <MembersTab members={members} user={user} />}
      {tab === 'manage'   && <ManageTab pending={pending} setPending={setPending} setBadges={setBadges} />}

      {/* 클럽 정보 수정 */}
      {showEditClub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 22, width: '100%', maxWidth: 340, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.accent, marginBottom: 14 }}>클럽 정보 수정</div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelSt}>클럽명 *</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={30} style={iSt} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>클럽 소개</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={80} rows={2} style={{ ...iSt, resize: 'none' }} />
            </div>
            {editMsg && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13, background: editMsg.startsWith('✅') ? C.successBg : C.errorBg, color: editMsg.startsWith('✅') ? C.success : C.error }}>{editMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowEditClub(false)} style={{ flex: 1, padding: '10px', background: C.surfaceAlt, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={saveClub} disabled={editSaving} style={{ flex: 2, padding: '10px', background: editSaving ? C.surfaceHigh : C.accent, color: editSaving ? C.text2 : '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {editSaving ? '저장 중...' : '💾 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴 확인 */}
      {showLeaveConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>클럽 탈퇴</div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>클럽을 탈퇴하면 클럽 기록과 랭킹에서 제외됩니다.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '11px', background: C.surfaceAlt, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleLeave} disabled={leavingLoading} style={{ flex: 1, padding: '11px', background: C.error, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {leavingLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 공지사항 탭 ────────────────────────────────────
function AnnTab({ announcements, setAnn, user }) {
  const isAdmin = user?.role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function post() {
    if (!title.trim()) return
    await req('/club/announcements', { method: 'POST', body: { title, body } })
    const updated = await req('/club/announcements')
    setAnn(updated); setTitle(''); setBody(''); setShowForm(false)
  }

  async function del(id) {
    if (!confirm('공지를 삭제할까요?')) return
    await req('/club/announcements/' + id, { method: 'DELETE' })
    setAnn(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div style={{ padding: '12px 14px' }}>
      {isAdmin && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowForm(f => !f)} style={{ fontSize: 12, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
            {showForm ? '취소' : '+ 공지 작성'}
          </button>
        </div>
      )}
      {showForm && (
        <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
          <input placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} style={{ ...iSt, marginBottom: 8 }} />
          <textarea placeholder="내용 (선택)" value={body} onChange={e => setBody(e.target.value)} rows={3} style={{ ...iSt, resize: 'none' }} />
          <button onClick={post} style={{ width: '100%', marginTop: 10, padding: '11px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>공지 올리기</button>
        </div>
      )}
      {announcements.length === 0
        ? <div style={{ fontSize: 13, color: C.text2, textAlign: 'center', padding: '32px 0' }}>공지사항이 없습니다.</div>
        : announcements.map(a => (
          <div key={a.id} style={{ background: C.surface, borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{a.title}</div>
              {isAdmin && <button onClick={() => del(a.id)} style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', fontSize: 13, padding: '0 0 0 8px' }}>✕</button>}
            </div>
            {a.body && <div style={{ fontSize: 12, color: C.text2, marginTop: 5 }}>{a.body}</div>}
            <div style={{ fontSize: 10, color: C.text3, marginTop: 7 }}>{a.nickname} · {a.created_at?.slice(0, 10)}</div>
          </div>
        ))
      }
    </div>
  )
}

// ── 훈련 탭 ───────────────────────────────────────
function TrainingTab({ dashboard, members, user }) {
  const heatmap = buildHeatmap(dashboard?.heatmap || [], dashboard?.from)

  return (
    <div style={{ padding: '14px 14px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>이번 주 훈련 현황</div>
      {!dashboard
        ? <div style={{ textAlign: 'center', padding: 32, color: C.text2 }}>⏳</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 280 }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, color: C.text2, fontWeight: 600, textAlign: 'left', paddingBottom: 6, paddingRight: 8, width: 80 }}>회원</th>
                  {['월','화','수','목','금','토','일'].map(d => (
                    <th key={d} style={{ fontSize: 10, color: C.text2, fontWeight: 600, textAlign: 'center', paddingBottom: 6, width: 32 }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.slice(0, 8).map(m => {
                  const row = heatmap[m.id] || {}
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: 10, color: m.id === user?.id ? C.accent : C.text2, fontWeight: m.id === user?.id ? 700 : 400, paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 80, textOverflow: 'ellipsis' }}>{m.nickname}</td>
                      {[0,1,2,3,4,5,6].map(di => {
                        const score = row[di] || 0
                        const intensity = score>30?5:score>20?4:score>10?3:score>3?2:score>0?1:0
                        const colors = [C.surfaceAlt,'rgba(79,156,249,0.2)','rgba(79,156,249,0.4)','rgba(79,156,249,0.6)','rgba(79,156,249,0.8)',C.accent]
                        return (
                          <td key={di} style={{ textAlign: 'center', paddingBottom: 5 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: colors[intensity], margin: '0 auto' }} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

// ── 회원 탭 ───────────────────────────────────────
function MembersTab({ members, user }) {
  return (
    <div style={{ padding: '12px 14px 8px' }}>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 10 }}>클럽 회원 {members.length}명</div>
      {members.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}`, gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
            {m.nickname?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.id === user?.id ? C.accent : C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              {m.nickname}
              {m.role === 'admin' && <span style={{ fontSize: 9, background: C.goldBg, color: C.gold, borderRadius: 4, padding: '1px 5px' }}>👑</span>}
              {m.id === user?.id && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px' }}>나</span>}
            </div>
            <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{(m.total_km||0).toFixed(1)}km · {m.total_workouts||0}회 훈련</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 관리 탭 (admin) ───────────────────────────────
function ManageTab({ pending, setPending, setBadges }) {
  async function handle(userId, status) {
    await req(`/admin/memberships/${userId}/status`, { method: 'PUT', body: { status } })
    setPending(prev => {
      const next = prev.filter(m => m.user_id !== userId)
      setBadges(b => ({ ...b, manage: next.length }))
      return next
    })
  }

  if (pending.length === 0) return (
    <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>대기 중인 가입 신청이 없습니다</div>
    </div>
  )

  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: C.text2, marginBottom: 10 }}>가입 대기 {pending.length}건</div>
      {pending.map(m => (
        <div key={m.id} style={{ background: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.message ? 10 : 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
              {m.nickname?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.nickname}</div>
              <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>신청일 {m.applied_at?.slice(0, 10)}</div>
            </div>
          </div>
          {m.message && <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: C.text2, fontStyle: 'italic' }}>"{m.message}"</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handle(m.user_id, 'rejected')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700 }}>✕ 거절</button>
            <button onClick={() => handle(m.user_id, 'approved')} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', background: C.successBg, color: C.success, fontSize: 13, fontWeight: 700 }}>✓ 승인</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function buildHeatmap(data, from) {
  const map = {}
  if (!from) return map
  const weekStart = new Date(from)
  data.forEach(row => {
    if (!row.logged_at) return
    const d = new Date(row.logged_at)
    const diff = Math.round((d - weekStart) / 86400000)
    if (diff < 0 || diff > 6) return
    if (!map[row.user_id]) map[row.user_id] = {}
    map[row.user_id][diff] = (map[row.user_id][diff] || 0) + (row.day_score || 0)
  })
  return map
}

const iSt = { width: '100%', padding: '10px 12px', display: 'block', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
