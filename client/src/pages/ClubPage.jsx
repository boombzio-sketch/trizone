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

  // 관리자는 항상 전체 화면
  if (user?.role === 'admin' || membership?.status === 'approved') {
    return <ClubContent user={user} membership={membership} onLeave={() => setMembership({ status: 'left' })} />
  }
  if (membership?.status === 'pending') {
    return <PendingView onCancel={async () => {
      // 신청 취소는 없으므로 안내만
    }} />
  }
  return <JoinView status={membership?.status} onJoined={() => setMembership({ status: 'pending' })} />
}

// ── 가입 신청 화면 ──────────────────────────────────
function JoinView({ status, onJoined }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setLoading(true); setError('')
    try {
      await api.joinClub(message)
      onJoined()
    } catch (e) { setError(e.message) }
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
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            가입 인사 (선택)
          </label>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="간단한 자기소개를 남겨보세요."
            rows={3}
            style={{ width: '100%', padding: '12px 14px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none' }}
          />
        </div>

        {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.error }}>{error}</div>}

        <button onClick={handleJoin} disabled={loading} style={{
          width: '100%', padding: '14px', border: 'none', borderRadius: 14,
          background: loading ? C.surfaceHigh : C.accent,
          color: loading ? C.text2 : '#fff',
          fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? '신청 중...' : '🙋 가입 신청하기'}
        </button>
      </div>
    </div>
  )
}

// ── 승인 대기 화면 ──────────────────────────────────
function PendingView() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 20, padding: 32, border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 10 }}>승인 대기 중</div>
        <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.8 }}>
          가입 신청이 접수되었습니다.<br />
          클럽장이 승인하면 클럽 활동을 시작할 수 있습니다.
        </div>
        <div style={{ marginTop: 24, padding: '12px 16px', background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 12, fontSize: 12, color: C.warn }}>
          승인 전에도 훈련 기록은 입력 가능합니다.
        </div>
      </div>
    </div>
  )
}

// ── 클럽 메인 화면 (승인된 회원) ──────────────────────
function ClubContent({ user, membership, onLeave }) {
  const [clubInfo, setClubInfo]   = useState(null)
  const [members, setMembers]     = useState([])
  const [announcements, setAnn]   = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [showAnnForm, setShowAnnForm] = useState(false)
  const [annTitle, setAnnTitle]   = useState('')
  const [annBody, setAnnBody]     = useState('')
  const [showEditClub, setShowEditClub] = useState(false)
  const [editName, setEditName]   = useState('')
  const [editDesc, setEditDesc]   = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg]     = useState('')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leavingLoading, setLeavingLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [c, m, a, d] = await Promise.all([
      req('/club/info'), req('/club/members'),
      req('/club/announcements'), req('/ranking/dashboard'),
    ])
    setClubInfo(c); setMembers(m); setAnn(a); setDashboard(d)
  }

  function openEdit() { setEditName(clubInfo?.name||''); setEditDesc(clubInfo?.description||''); setEditMsg(''); setShowEditClub(true) }

  async function saveClub() {
    if (!editName.trim()) { setEditMsg('클럽명을 입력하세요.'); return }
    setEditSaving(true); setEditMsg('')
    try {
      await req('/club/info', { method: 'PUT', body: { name: editName.trim(), description: editDesc.trim() } })
      setClubInfo(await req('/club/info'))
      setEditMsg('✅ 저장됐습니다!')
      setTimeout(() => setShowEditClub(false), 900)
    } catch(e) { setEditMsg('❌ ' + e.message) }
    finally { setEditSaving(false) }
  }

  async function postAnn() {
    if (!annTitle.trim()) return
    await req('/club/announcements', { method: 'POST', body: { title: annTitle, body: annBody } })
    setAnn(await req('/club/announcements')); setAnnTitle(''); setAnnBody(''); setShowAnnForm(false)
  }

  async function deleteAnn(id) {
    if (!confirm('공지를 삭제할까요?')) return
    await req('/club/announcements/' + id, { method: 'DELETE' })
    setAnn(prev => prev.filter(x => x.id !== id))
  }

  async function handleLeave() {
    setLeavingLoading(true)
    try {
      await api.leaveClub()
      onLeave()
    } catch(e) { alert(e.message) }
    finally { setLeavingLoading(false) }
  }

  const heatmap = buildHeatmap(dashboard?.heatmap || [], dashboard?.from)

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
              {user?.role === 'admin' && (
                <button onClick={openEdit} style={{ fontSize: 11, fontWeight: 700, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '7px 12px', cursor: 'pointer' }}>✏️ 수정</button>
              )}
              {user?.role !== 'admin' && (
                <button onClick={() => setShowLeaveConfirm(true)} style={{ fontSize: 11, fontWeight: 700, background: C.errorBg, color: C.error, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '7px 12px', cursor: 'pointer' }}>탈퇴</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴 확인 */}
      {showLeaveConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>클럽 탈퇴</div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>
              클럽을 탈퇴하면 클럽 기록과 랭킹에서 제외됩니다.<br />재가입 신청은 언제든 가능합니다.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '11px', background: C.surfaceAlt, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleLeave} disabled={leavingLoading} style={{ flex: 1, padding: '11px', background: C.error, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {leavingLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 클럽 정보 수정 */}
      {showEditClub && (
        <div style={{ margin: '12px 14px', background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 14 }}>클럽 정보 수정</div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelSt}>클럽명 *</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="예: 서울철인클럽" maxLength={30} style={iSt} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>클럽 소개 (선택)</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="예: 수영·사이클·런 통합 훈련 동호회" maxLength={80} rows={2} style={{ ...iSt, resize: 'none' }} />
          </div>
          {editMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13, background: editMsg.startsWith('✅') ? C.successBg : C.errorBg, color: editMsg.startsWith('✅') ? C.success : C.error, border: `1px solid ${editMsg.startsWith('✅') ? C.successBorder : C.errorBorder}` }}>
              {editMsg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowEditClub(false)} style={{ flex: 1, padding: '10px', background: C.surfaceAlt, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
            <button onClick={saveClub} disabled={editSaving} style={{ flex: 2, padding: '10px', background: editSaving ? C.surfaceHigh : C.accent, color: editSaving ? C.text2 : '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: editSaving ? 'default' : 'pointer' }}>
              {editSaving ? '저장 중...' : '💾 저장하기'}
            </button>
          </div>
        </div>
      )}

      {/* 이번 주 훈련 현황 */}
      {dashboard && (
        <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>이번 주 훈련 현황</div>
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
                      <td style={{ fontSize: 10, color: m.id===user?.id ? C.accent : C.text2, fontWeight: m.id===user?.id ? 700 : 400, paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 80, textOverflow: 'ellipsis' }}>{m.nickname}</td>
                      {[0,1,2,3,4,5,6].map(di => {
                        const score = row[di] || 0
                        const intensity = score>30?5:score>20?4:score>10?3:score>3?2:score>0?1:0
                        const colors = [C.surfaceAlt,'rgba(79,156,249,0.2)','rgba(79,156,249,0.4)','rgba(79,156,249,0.6)','rgba(79,156,249,0.8)',C.accent]
                        return <td key={di} style={{ textAlign: 'center', paddingBottom: 5 }}><div style={{ width: 24, height: 24, borderRadius: 6, background: colors[intensity], margin: '0 auto' }} /></td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 공지사항 */}
      <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📢 공지사항</div>
          {user?.role === 'admin' && (
            <button onClick={() => setShowAnnForm(f => !f)} style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 700 }}>
              {showAnnForm ? '취소' : '+ 작성'}
            </button>
          )}
        </div>
        {showAnnForm && (
          <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
            <input placeholder="제목" value={annTitle} onChange={e => setAnnTitle(e.target.value)} style={{ ...iSt, marginBottom: 8 }} />
            <textarea placeholder="내용 (선택)" value={annBody} onChange={e => setAnnBody(e.target.value)} rows={3} style={{ ...iSt, resize: 'none' }} />
            <button onClick={postAnn} style={{ width: '100%', marginTop: 10, padding: '11px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>공지 올리기</button>
          </div>
        )}
        {announcements.length === 0
          ? <div style={{ fontSize: 13, color: C.text2, textAlign: 'center', padding: '16px 0' }}>공지사항이 없습니다.</div>
          : announcements.map(a => (
            <div key={a.id} style={{ background: C.surfaceAlt, borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{a.title}</div>
                {user?.role === 'admin' && <button onClick={() => deleteAnn(a.id)} style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', fontSize: 13, padding: '0 0 0 8px' }}>✕</button>}
              </div>
              {a.body && <div style={{ fontSize: 12, color: C.text2, marginTop: 5 }}>{a.body}</div>}
              <div style={{ fontSize: 10, color: C.text3, marginTop: 7 }}>{a.nickname} · {a.created_at?.slice(0,10)}</div>
            </div>
          ))
        }
      </div>

      {/* 회원 목록 */}
      <div style={{ padding: '14px 14px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>👥 클럽 회원 ({members.length}명)</div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}`, gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
              {m.nickname?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: m.id===user?.id ? C.accent : C.text, display:'flex', alignItems:'center', gap:6 }}>
                {m.nickname}
                {m.role === 'admin' && <span style={{ fontSize: 9, background: C.goldBg, color: C.gold, borderRadius: 4, padding: '1px 5px' }}>👑</span>}
                {m.id === user?.id && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px' }}>나</span>}
              </div>
              <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{(m.total_km||0).toFixed(1)}km · {m.total_workouts||0}회 훈련</div>
            </div>
          </div>
        ))}
      </div>
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
