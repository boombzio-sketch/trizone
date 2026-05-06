import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

const BASE = '/api'
function getToken() { return localStorage.getItem('tz_token') }
async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.')
  return data
}

export default function ClubPage() {
  const { user } = useAuth()
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

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [c, m, a, d] = await Promise.all([
      req('/club/info'), req('/club/members'),
      req('/club/announcements'), req('/ranking/dashboard'),
    ])
    setClubInfo(c); setMembers(m); setAnn(a); setDashboard(d)
  }

  function openEdit() {
    setEditName(clubInfo?.name || '')
    setEditDesc(clubInfo?.description || '')
    setEditMsg('')
    setShowEditClub(true)
  }

  async function saveClub() {
    if (!editName.trim()) { setEditMsg('클럽명을 입력하세요.'); return }
    setEditSaving(true); setEditMsg('')
    try {
      await req('/club/info', { method: 'PUT', body: { name: editName.trim(), description: editDesc.trim() } })
      const c = await req('/club/info')
      setClubInfo(c)
      setEditMsg('✅ 저장됐습니다!')
      setTimeout(() => setShowEditClub(false), 900)
    } catch(e) {
      setEditMsg('❌ ' + e.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function postAnn() {
    if (!annTitle.trim()) return
    await req('/club/announcements', { method: 'POST', body: { title: annTitle, body: annBody } })
    const a = await req('/club/announcements')
    setAnn(a); setAnnTitle(''); setAnnBody(''); setShowAnnForm(false)
  }

  async function deleteAnn(id) {
    if (!confirm('공지를 삭제할까요?')) return
    await req('/club/announcements/' + id, { method: 'DELETE' })
    setAnn(prev => prev.filter(x => x.id !== id))
  }

  const heatmap = buildHeatmap(dashboard?.heatmap || [], dashboard?.from)

  return (
    <div style={{ paddingBottom: 16 }}>

      {clubInfo && (
        <div style={{ background: 'linear-gradient(135deg,#0A1828,#142040)', padding: '16px', borderBottom: '1px solid #16202E' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0A1828', border: '1px solid #2A3A4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#E8E6E0' }}>{clubInfo.name}</div>
              <div style={{ fontSize: 11, color: '#4A5A6A', marginTop: 2 }}>{clubInfo.description || '소개 없음'} · 회원 {clubInfo.member_count}명</div>
            </div>
            {user?.role === 'admin' && (
              <button onClick={openEdit} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, background: 'rgba(77,184,255,0.12)', color: '#4DB8FF', border: '1px solid rgba(77,184,255,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                ✏️ 수정
              </button>
            )}
          </div>
        </div>
      )}

      {showEditClub && (
        <div style={{ margin: '12px 14px', background: '#0C1420', border: '1px solid rgba(77,184,255,0.3)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4DB8FF', marginBottom: 14 }}>🏊 클럽 정보 수정</div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelSt}>클럽명 *</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="예: 서울철인클럽" maxLength={30} style={iSt} />
            <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 4, textAlign: 'right' }}>{editName.length} / 30자</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>클럽 소개 (선택)</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="예: 수영·사이클·런 통합 훈련 동호회 · 서울" maxLength={80} rows={2} style={{ ...iSt, resize: 'none' }} />
            <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 4, textAlign: 'right' }}>{editDesc.length} / 80자</div>
          </div>

          {editMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13, background: editMsg.startsWith('✅') ? 'rgba(0,220,130,0.1)' : 'rgba(255,80,80,0.1)', color: editMsg.startsWith('✅') ? '#00DC82' : '#FF5050', border: '1px solid ' + (editMsg.startsWith('✅') ? 'rgba(0,220,130,0.3)' : 'rgba(255,80,80,0.3)') }}>
              {editMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowEditClub(false)} style={{ flex: 1, padding: '10px', background: '#101820', color: '#5A6A7A', border: '1px solid #1E2A3A', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
            <button onClick={saveClub} disabled={editSaving} style={{ flex: 2, padding: '10px', background: editSaving ? '#1A2A3E' : '#4DB8FF', color: '#080B10', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: editSaving ? 'default' : 'pointer' }}>
              {editSaving ? '저장 중...' : '💾 저장하기'}
            </button>
          </div>
        </div>
      )}

      {dashboard && (
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #12192A' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4DB8FF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>이번 주 훈련 현황</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 280 }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, color: '#3A4A5A', fontWeight: 600, textAlign: 'left', paddingBottom: 6, paddingRight: 8, width: 80 }}>회원</th>
                  {['월','화','수','목','금','토','일'].map(d => (
                    <th key={d} style={{ fontSize: 10, color: '#3A4A5A', fontWeight: 600, textAlign: 'center', paddingBottom: 6, width: 32 }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.slice(0, 8).map(m => {
                  const row = heatmap[m.id] || {}
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: 10, color: m.id === user?.id ? '#4DB8FF' : '#6A7A8A', fontWeight: m.id === user?.id ? 700 : 400, paddingBottom: 4, paddingRight: 8, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 80, textOverflow: 'ellipsis' }}>{m.nickname}</td>
                      {[0,1,2,3,4,5,6].map(di => {
                        const score = row[di] || 0
                        const intensity = score > 30 ? 5 : score > 20 ? 4 : score > 10 ? 3 : score > 3 ? 2 : score > 0 ? 1 : 0
                        const colors = ['#0E1520','rgba(77,184,255,0.2)','rgba(77,184,255,0.4)','rgba(77,184,255,0.6)','rgba(77,184,255,0.8)','#4DB8FF']
                        return <td key={di} style={{ textAlign: 'center', paddingBottom: 4 }}><div style={{ width: 22, height: 22, borderRadius: 4, background: colors[intensity], margin: '0 auto' }} /></td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 9, color: '#3A4A5A', marginTop: 6 }}>색이 진할수록 훈련 강도가 높음</div>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #12192A' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0' }}>📢 공지사항</div>
          {user?.role === 'admin' && (
            <button onClick={() => setShowAnnForm(f => !f)} style={{ fontSize: 11, color: '#4DB8FF', background: 'rgba(77,184,255,0.1)', border: '1px solid rgba(77,184,255,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
              {showAnnForm ? '취소' : '+ 작성'}
            </button>
          )}
        </div>
        {showAnnForm && (
          <div style={{ background: '#0C1420', borderRadius: 12, padding: 12, marginBottom: 12, border: '1px solid #1E2A3A' }}>
            <input placeholder="제목" value={annTitle} onChange={e => setAnnTitle(e.target.value)} style={{ ...iSt, marginBottom: 8 }} />
            <textarea placeholder="내용 (선택)" value={annBody} onChange={e => setAnnBody(e.target.value)} rows={3} style={{ ...iSt, resize: 'none' }} />
            <button onClick={postAnn} style={{ width: '100%', marginTop: 8, padding: '10px', background: '#4DB8FF', color: '#080B10', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>공지 올리기</button>
          </div>
        )}
        {announcements.length === 0
          ? <div style={{ fontSize: 13, color: '#3A4A5A', textAlign: 'center', padding: '16px 0' }}>공지사항이 없습니다.</div>
          : announcements.map(a => (
            <div key={a.id} style={{ background: '#0C1420', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid #16202E' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0', flex: 1 }}>{a.title}</div>
                {user?.role === 'admin' && <button onClick={() => deleteAnn(a.id)} style={{ background: 'none', border: 'none', color: '#3A4A5A', cursor: 'pointer', fontSize: 12, padding: '0 0 0 8px' }}>✕</button>}
              </div>
              {a.body && <div style={{ fontSize: 12, color: '#5A6A7A', marginTop: 4 }}>{a.body}</div>}
              <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 6 }}>{a.nickname} · {a.created_at?.slice(0,10)}</div>
            </div>
          ))
        }
      </div>

      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6E0', marginBottom: 10 }}>👥 회원 목록</div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #0E1520', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.avatar_color+'22', border: '2px solid ' + m.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
              {m.nickname?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: m.id===user?.id ? '#4DB8FF' : '#E8E6E0', display:'flex', alignItems:'center', gap:6 }}>
                {m.nickname}
                {m.role === 'admin' && <span style={{ fontSize: 9, background: 'rgba(255,200,0,0.15)', color: '#FFD700', borderRadius: 4, padding: '1px 5px' }}>👑 관리자</span>}
                {m.id === user?.id && <span style={{ fontSize: 9, background: 'rgba(77,184,255,0.15)', color: '#4DB8FF', borderRadius: 4, padding: '1px 5px' }}>나</span>}
              </div>
              <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 1 }}>총 {(m.total_km||0).toFixed(1)}km · {m.total_workouts||0}회 훈련</div>
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

const iSt = { width: '100%', padding: '10px 12px', display: 'block', background: '#080B10', border: '1px solid #1E2A3A', borderRadius: 8, color: '#E8E6E0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: '#4A5A6A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
