import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const REGIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']
const TABS = ['공지사항','훈련','회원','관리']

export default function ClubDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [club, setClub] = useState(null)
  const [membership, setMembership] = useState({ status: null })
  const [members, setMembers] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('공지사항')

  const [joinMsg, setJoinMsg] = useState('')
  const [joining, setJoining] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', region: '' })
  const [editSaving, setEditSaving] = useState(false)

  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [showAnnForm, setShowAnnForm] = useState(false)
  const [trainings, setTrainings] = useState([])
  const [trainingStats, setTrainingStats] = useState({})
  const [showTrainingForm, setShowTrainingForm] = useState(false)
  const [editingTraining, setEditingTraining] = useState(null)
  const [trainingForm, setTrainingForm] = useState({ title:'', train_date:'', train_time:'', location:'', description:'', capacity:'', link_url:'' })
  const [trainingParticipants, setTrainingParticipants] = useState({})
  const [trainingSaving, setTrainingSaving] = useState(false)
  const [trainingViewMode, setTrainingViewMode] = useState('calendar')
  const [showTransfer, setShowTransfer] = useState(false)
  const [selectedNewLeader, setSelectedNewLeader] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState('')

  const isLeader = club?.leader_id === user?.id
  const isAdmin = user?.role === 'admin'
  const canManage = isLeader || isAdmin

  useEffect(() => { loadAll() }, [id])

  async function loadTrainings() {
    const [tr, stats] = await Promise.all([
      api.getClubTrainings(id),
      api.getClubTrainingStats(id),
    ])
    setTrainings(tr)
    const statsMap = {}
    stats.forEach(s => { statsMap[s.user_id] = s })
    setTrainingStats(statsMap)
    // 모든 훈련의 참가자 목록 미리 로드
    const participantMap = {}
    await Promise.all(tr.map(async t => {
      const rows = await api.getTrainingParticipants(id, t.id)
      participantMap[t.id] = rows
    }))
    setTrainingParticipants(participantMap)
  }

  async function handleTrainingSubmit(e) {
    e.preventDefault()
    setTrainingSaving(true)
    try {
      if (editingTraining) {
        await api.updateClubTraining(id, editingTraining.id, { ...trainingForm, capacity: parseInt(trainingForm.capacity)||0 })
      } else {
        await api.createClubTraining(id, { ...trainingForm, capacity: parseInt(trainingForm.capacity)||0 })
      }
      await loadTrainings()
      setShowTrainingForm(false); setEditingTraining(null)
      setTrainingForm({ title:'', train_date:'', train_time:'', location:'', description:'', capacity:'', link_url:'' })
    } catch(e) { alert(e.message) }
    finally { setTrainingSaving(false) }
  }

  async function handleDeleteTraining(tid) {
    if (!confirm('훈련을 삭제할까요?')) return
    await api.deleteClubTraining(id, tid)
    setTrainings(prev => prev.filter(t => t.id !== tid))
  }

  async function handleJoinTraining(tid) {
    await api.joinClubTraining(id, tid)
    setTrainings(prev => prev.map(t => t.id === tid ? { ...t, my_status: 'joined', participant_count: (t.participant_count||0)+1 } : t))
  }

  async function handleLeaveTraining(tid) {
    await api.leaveClubTraining(id, tid)
    setTrainings(prev => prev.map(t => t.id === tid ? { ...t, my_status: null, participant_count: Math.max(0,(t.participant_count||1)-1) } : t))
  }

  async function loadTrainingParticipants(tid) {
    if (!trainingParticipants[tid]) {
      const rows = await api.getTrainingParticipants(id, tid)
      setTrainingParticipants(prev => ({ ...prev, [tid]: rows }))
    }
  }

  async function toggleExpandTraining(tid) {
    if (expandedTraining === tid) { setExpandedTraining(null); return }
    setExpandedTraining(tid)
    await loadTrainingParticipants(tid)
  }

  async function handleAttendance(tid, userId, current) {
    const next = current === 'attended' ? 'joined' : current === 'absent' ? 'joined' : 'attended'
    await api.setTrainingAttendance(id, tid, userId, next)
    setTrainingParticipants(prev => ({
      ...prev,
      [tid]: (prev[tid]||[]).map(p => p.user_id === userId ? { ...p, status: next } : p)
    }))
  }

  async function handleAbsent(tid, userId, current) {
    const next = current === 'absent' ? 'joined' : 'absent'
    await api.setTrainingAttendance(id, tid, userId, next)
    setTrainingParticipants(prev => ({
      ...prev,
      [tid]: (prev[tid]||[]).map(p => p.user_id === userId ? { ...p, status: next } : p)
    }))
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [clubData, memData, annData] = await Promise.all([
        api.getClub(id),
        api.getClubMembership(id),
        api.getClubAnnouncements(id),
      ])
      setClub(clubData)
      setMembership(memData)
      setAnnouncements(annData)
      setEditForm({ name: clubData.name, description: clubData.description, region: clubData.region })

      if (memData.status === 'approved' || clubData.leader_id === user?.id || user?.role === 'admin') {
        const [membersData] = await Promise.all([api.getClubMembers(id)])
        setMembers(membersData)
        await loadTrainings()
      }
      if (canManage || clubData.leader_id === user?.id || user?.role === 'admin') {
        const pending = await api.getClubPendingMembers(id).catch(() => [])
        setPendingMembers(pending)
      }
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleJoin() {
    setJoining(true); setError('')
    try {
      await api.joinClubById(id, joinMsg)
      setMembership({ status: 'pending' })
      setShowJoinForm(false)
    } catch(e) { setError(e.message) }
    finally { setJoining(false) }
  }

  async function handleLeave() {
    try {
      await api.leaveClubById(id)
      setMembership({ status: 'left' })
      setShowLeaveConfirm(false)
    } catch(e) { alert(e.message) }
  }

  async function handleEditSave(e) {
    e.preventDefault()
    setEditSaving(true)
    try {
      const updated = await api.updateClub(id, editForm)
      setClub(updated)
      setShowEditForm(false)
    } catch(e) { setError(e.message) }
    finally { setEditSaving(false) }
  }

  async function handleDeleteClub() {
    setDeleting(true)
    try {
      await api.deleteClub(id)
      navigate('/clubs')
    } catch(e) { alert(e.message) }
    finally { setDeleting(false) }
  }

  async function handleTransferLeader() {
    if (!selectedNewLeader) return
    if (!confirm(`정말로 ${members.find(m => m.id === Number(selectedNewLeader))?.nickname}님에게 클럽장을 양도하시겠습니까?`)) return
    setTransferring(true)
    try {
      const updated = await api.transferClubLeader(id, Number(selectedNewLeader))
      setClub(updated)
      setShowTransfer(false)
      setSelectedNewLeader('')
    } catch(e) { alert(e.message) }
    finally { setTransferring(false) }
  }

  async function handleMemberStatus(userId, status) {
    await api.setClubMemberStatus(id, userId, status)
    setPendingMembers(prev => prev.filter(m => m.user_id !== userId))
    if (status === 'approved') {
      const updated = await api.getClubMembers(id)
      setMembers(updated)
    }
  }

  async function handlePostAnn(e) {
    e.preventDefault()
    if (!annTitle.trim()) return
    const row = await api.postClubAnnouncement(id, { title: annTitle, body: annBody })
    setAnnouncements(prev => [row, ...prev])
    setAnnTitle(''); setAnnBody(''); setShowAnnForm(false)
  }

  async function handleDeleteAnn(annId) {
    if (!confirm('공지를 삭제할까요?')) return
    await api.deleteClubAnnouncement(id, annId)
    setAnnouncements(prev => prev.filter(a => a.id !== annId))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
  if (!club) return <div style={{ textAlign: 'center', padding: 48, color: C.error }}>클럽을 찾을 수 없습니다.</div>

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: `linear-gradient(135deg, ${C.surfaceHigh}, ${C.surface})`, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => navigate('/clubs')} style={{ background: C.surfaceAlt, border: 'none', borderRadius: 10, padding: '6px 12px', color: C.text2, fontSize: 13, cursor: 'pointer' }}>← 목록</button>
          <span style={{ fontSize: 10, fontWeight: 700, background: C.accentBg, color: C.accent, borderRadius: 6, padding: '2px 10px' }}>{club.region}</span>
          {canManage && (
            <button onClick={() => setShowEditForm(s => !s)} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
              {showEditForm ? '취소' : '✏️ 수정'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{club.name}</div>
        {club.description && <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{club.description}</div>}
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div><span style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>{club.member_count}</span><span style={{ fontSize: 11, color: C.text2, marginLeft: 3 }}>회원</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: (club.leader_color||C.accent)+'22', border: `1.5px solid ${club.leader_color||C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: club.leader_color||C.accent }}>
              {club.leader_name?.charAt(0)}
            </div>
            <span style={{ fontSize: 11, color: C.text2 }}>클럽장 {club.leader_name}</span>
          </div>
        </div>
      </div>

      {/* 클럽 수정 폼 */}
      {showEditForm && (
        <form onSubmit={handleEditSave} style={{ margin: '12px', background: C.surface, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={labelSt}>클럽명</label>
            <input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} required style={iSt} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelSt}>지역</label>
            <select value={editForm.region} onChange={e => setEditForm(p => ({...p, region: e.target.value}))} style={{ ...iSt, cursor: 'pointer' }}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>소개</label>
            <textarea value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))} rows={2} style={{ ...iSt, resize: 'none' }} />
          </div>
          <button type="submit" disabled={editSaving} style={{ width: '100%', padding: '11px', border: 'none', borderRadius: 10, background: editSaving ? C.surfaceHigh : C.accent, color: editSaving ? C.text2 : '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            {editSaving ? '저장 중...' : '💾 저장'}
          </button>
        </form>
      )}

      {/* 멤버십 상태 + 가입/탈퇴 */}
      {!isLeader && !isAdmin && (
        <div style={{ margin: '12px', background: C.surface, borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}` }}>
          {membership.status === 'approved' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>✅ 가입된 클럽</span>
              <button onClick={() => setShowLeaveConfirm(true)} style={{ padding: '6px 14px', border: 'none', borderRadius: 100, background: C.errorBg, color: C.error, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>탈퇴</button>
            </div>
          ) : membership.status === 'pending' ? (
            <div style={{ fontSize: 13, color: C.warn, fontWeight: 600 }}>⏳ 클럽장 승인 대기 중</div>
          ) : (
            <div>
              {!showJoinForm ? (
                <button onClick={() => setShowJoinForm(true)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 12, background: C.accent, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                  🙋 클럽 가입 신청
                </button>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>가입 인사</div>
                  <textarea value={joinMsg} onChange={e => setJoinMsg(e.target.value)} placeholder="간단한 자기소개를 남겨주세요." rows={2} style={{ ...iSt, resize: 'none', marginBottom: 10 }} />
                  {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: C.error }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowJoinForm(false)} style={{ flex: 1, padding: '10px', background: C.surfaceAlt, border: 'none', borderRadius: 10, color: C.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                    <button onClick={handleJoin} disabled={joining} style={{ flex: 2, padding: '10px', background: C.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {joining ? '신청 중...' : '신청하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 탈퇴 확인 모달 */}
      {showLeaveConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>클럽 탈퇴</div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>{club.name}에서 탈퇴합니다.<br />재가입 신청은 언제든 가능합니다.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '11px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleLeave} style={{ flex: 1, padding: '11px', background: C.error, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>탈퇴</button>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: 'flex', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {(canManage ? TABS : ['공지사항','훈련','회원']).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '13px 0', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            color: tab === t ? C.accent : C.text2,
            borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
          }}>{t}</button>
        ))}
      </div>

      {/* 훈련 탭 */}
      {tab === '훈련' && (
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {canManage ? (
              <button onClick={() => { setShowTrainingForm(s => !s); setEditingTraining(null); setTrainingForm({ title:'', train_date:'', train_time:'', location:'', description:'', capacity:'', link_url:'' }) }}
                style={{ fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                {showTrainingForm && !editingTraining ? '취소' : '+ 훈련 만들기'}
              </button>
            ) : <div />}
            <div style={{ display: 'flex', background: C.surfaceAlt, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
              <button onClick={() => setTrainingViewMode('list')} style={{ padding: '5px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', background: trainingViewMode === 'list' ? C.surfaceHigh : 'transparent', color: trainingViewMode === 'list' ? C.text : C.text2, fontSize: 15 }}>☰</button>
              <button onClick={() => setTrainingViewMode('calendar')} style={{ padding: '5px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', background: trainingViewMode === 'calendar' ? C.surfaceHigh : 'transparent', color: trainingViewMode === 'calendar' ? C.accent : C.text2, fontSize: 15 }}>📅</button>
            </div>
          </div>

          {/* 훈련 등록/수정 폼 */}
          {showTrainingForm && (
            <form onSubmit={handleTrainingSubmit} style={{ background: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 14 }}>{editingTraining ? '훈련 수정' : '훈련 만들기'}</div>
              {[['title','훈련명 *','text','예: 한강 수영 훈련'],['location','장소 *','text','예: 잠실 올림픽수영장']].map(([k,l,t,p]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <label style={labelSt}>{l}</label>
                  <input type={t} value={trainingForm[k]} onChange={e => setTrainingForm(f => ({...f,[k]:e.target.value}))} placeholder={p} required={l.includes('*')} style={iSt} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div><label style={labelSt}>날짜 *</label><input type="date" value={trainingForm.train_date} onChange={e => setTrainingForm(f => ({...f,train_date:e.target.value}))} required style={iSt} /></div>
                <div><label style={labelSt}>시간</label><input type="time" value={trainingForm.train_time} onChange={e => setTrainingForm(f => ({...f,train_time:e.target.value}))} style={iSt} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div><label style={labelSt}>최대 인원</label><input type="number" placeholder="0=제한없음" value={trainingForm.capacity} onChange={e => setTrainingForm(f => ({...f,capacity:e.target.value}))} style={iSt} /></div>
                <div><label style={labelSt}>링크 (카페 등)</label><input type="url" placeholder="https://..." value={trainingForm.link_url} onChange={e => setTrainingForm(f => ({...f,link_url:e.target.value}))} style={iSt} /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelSt}>훈련 내용</label>
                <textarea value={trainingForm.description} onChange={e => setTrainingForm(f => ({...f,description:e.target.value}))} rows={3} placeholder="훈련 내용을 입력하세요" style={{ ...iSt, resize: 'none' }} />
              </div>
              <button type="submit" disabled={trainingSaving} style={{ width: '100%', padding: '11px', border: 'none', borderRadius: 10, background: trainingSaving ? C.surfaceHigh : C.accent, color: trainingSaving ? C.text2 : '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {trainingSaving ? '저장 중...' : '💾 저장'}
              </button>
            </form>
          )}

          {/* 달력 뷰 */}
          {trainingViewMode === 'calendar' && (
            <TrainingCalendar
              trainings={trainings}
              participants={trainingParticipants}
              canManage={canManage}
              membership={membership}
              isPast={t => t.train_date < new Date().toISOString().slice(0,10)}
              onJoin={handleJoinTraining}
              onLeave={handleLeaveTraining}
              onAttendance={handleAttendance}
              onAbsent={handleAbsent}
              onEdit={t => { setEditingTraining(t); setTrainingForm({ title:t.title, train_date:t.train_date, train_time:t.train_time||'', location:t.location, description:t.description||'', capacity:t.capacity||'', link_url:t.link_url||'' }); setShowTrainingForm(true) }}
              onDelete={handleDeleteTraining}
              setTrainings={setTrainings}
            />
          )}

          {trainingViewMode === 'list' && trainings.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: C.text2, fontSize: 13 }}>등록된 훈련이 없습니다.</div>
          )}
          {trainingViewMode === 'list' && trainings.map(t => {
            const isPast = t.train_date < new Date().toISOString().slice(0,10)
            const isExpanded = expandedTraining === t.id
            const parts = trainingParticipants[t.id] || []
            const isFull = t.capacity > 0 && t.participant_count >= t.capacity

            return (
              <div key={t.id} style={{ background: C.surface, borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderLeft: `4px solid ${isPast ? C.text3 : C.accent}`, opacity: isPast ? 0.85 : 1 }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: C.text2, marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span>📅 {t.train_date}{t.train_time ? ` ${t.train_time}` : ''}</span>
                        <span>📍 {t.location}</span>
                        {t.capacity > 0 && <span>👥 {t.participant_count}/{t.capacity}명</span>}
                        {!t.capacity && <span>👥 {t.participant_count}명 신청</span>}
                      </div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button onClick={() => { setEditingTraining(t); setTrainingForm({ title:t.title, train_date:t.train_date, train_time:t.train_time||'', location:t.location, description:t.description||'', capacity:t.capacity||'', link_url:t.link_url||'' }); setShowTrainingForm(true) }} style={{ background: C.accentBg, border: 'none', borderRadius: 7, color: C.accent, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 8px' }}>수정</button>
                        <button onClick={() => handleDeleteTraining(t.id)} style={{ background: C.errorBg, border: 'none', borderRadius: 7, color: C.error, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 8px' }}>삭제</button>
                      </div>
                    )}
                  </div>

                  {t.description && <div style={{ fontSize: 12, color: C.text2, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{t.description}</div>}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {t.link_url && (
                      <a href={t.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 7, padding: '4px 10px', textDecoration: 'none' }}>🔗 상세보기</a>
                    )}
                    {!isPast && membership?.status === 'approved' && (
                      t.my_status ? (
                        <button onClick={() => handleLeaveTraining(t.id)} style={{ fontSize: 11, fontWeight: 700, color: C.text2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>참가 취소</button>
                      ) : (
                        <button onClick={() => handleJoinTraining(t.id)} disabled={isFull} style={{ fontSize: 11, fontWeight: 700, color: isFull ? C.text3 : '#fff', background: isFull ? C.surfaceAlt : C.accent, border: 'none', borderRadius: 7, padding: '4px 10px', cursor: isFull ? 'default' : 'pointer' }}>
                          {isFull ? '마감' : '참가 신청'}
                        </button>
                      )
                    )}
                    {t.my_status === 'attended' && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 5, padding: '2px 7px' }}>✓ 참석</span>}
                    {t.my_status === 'absent' && <span style={{ fontSize: 10, fontWeight: 700, color: C.error, background: C.errorBg, borderRadius: 5, padding: '2px 7px' }}>✗ 불참</span>}
                  </div>
                </div>

                {/* 참가자 목록 (항상 표시) */}
                <div style={{ background: C.surfaceAlt, borderTop: `1px solid ${C.border}`, padding: '10px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6 }}>참가자 {parts.length}명</div>
                    {parts.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.text2 }}>신청자가 없습니다.</div>
                    ) : parts.map(p => (
                      <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.avatar_color+'22', border: `1.5px solid ${p.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: p.avatar_color, flexShrink: 0 }}>{p.nickname?.charAt(0)}</div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{p.nickname}</span>
                        {p.status === 'attended' && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 5, padding: '2px 7px' }}>✓ 참석</span>}
                        {p.status === 'absent' && <span style={{ fontSize: 10, fontWeight: 700, color: C.error, background: C.errorBg, borderRadius: 5, padding: '2px 7px' }}>✗ 불참</span>}
                        {p.status === 'joined' && <span style={{ fontSize: 10, color: C.text2 }}>신청</span>}
                        {canManage && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => handleAttendance(t.id, p.user_id, p.status)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', background: p.status==='attended' ? C.success : C.successBg, color: p.status==='attended' ? '#fff' : C.success }}>참석</button>
                            <button onClick={() => handleAbsent(t.id, p.user_id, p.status)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', background: p.status==='absent' ? C.error : C.errorBg, color: p.status==='absent' ? '#fff' : C.error }}>불참</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 공지사항 탭 */}
      {tab === '공지사항' && (
        <div style={{ padding: '12px' }}>
          {canManage && (
            <div style={{ marginBottom: 12 }}>
              {!showAnnForm ? (
                <button onClick={() => setShowAnnForm(true)} style={{ fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>+ 공지 작성</button>
              ) : (
                <form onSubmit={handlePostAnn} style={{ background: C.surface, borderRadius: 14, padding: 14, border: `1px solid ${C.border}` }}>
                  <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="제목" required style={{ ...iSt, marginBottom: 8 }} />
                  <textarea value={annBody} onChange={e => setAnnBody(e.target.value)} placeholder="내용 (선택)" rows={3} style={{ ...iSt, resize: 'none', marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setShowAnnForm(false)} style={{ flex: 1, padding: '9px', background: C.surfaceAlt, border: 'none', borderRadius: 10, color: C.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                    <button type="submit" style={{ flex: 2, padding: '9px', background: C.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>게시</button>
                  </div>
                </form>
              )}
            </div>
          )}
          {announcements.length === 0
            ? <div style={{ textAlign: 'center', padding: 32, color: C.text2, fontSize: 13 }}>공지사항이 없습니다.</div>
            : announcements.map(a => (
              <div key={a.id} style={{ background: C.surface, borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.title}</div>
                  {canManage && <button onClick={() => handleDeleteAnn(a.id)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 13 }}>✕</button>}
                </div>
                {a.body && <div style={{ fontSize: 12, color: C.text2, marginTop: 5 }}>{a.body}</div>}
                <div style={{ fontSize: 10, color: C.text3, marginTop: 6 }}>{a.nickname} · {a.created_at?.slice(0,10)}</div>
              </div>
            ))}
        </div>
      )}

      {/* 회원 탭 */}
      {tab === '회원' && (
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 8 }}>승인 회원 {members.length}명</div>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
                {m.nickname?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: m.id===user?.id ? C.accent : C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.nickname}
                  {club.leader_id === m.id && <span style={{ fontSize: 9, background: C.goldBg, color: C.gold, borderRadius: 4, padding: '1px 5px' }}>👑</span>}
                  {m.id === user?.id && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 5px' }}>나</span>}
                </div>
                <div style={{ fontSize: 10, color: C.text2, marginTop: 1 }}>
                {(m.total_km||0).toFixed(1)}km · 훈련 {m.total_workouts||0}회
                {trainingStats[m.id] && ` · 모임 ${trainingStats[m.id].attended||0}회 참석`}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 관리 탭 (클럽장/admin) */}
      {tab === '관리' && canManage && (
        <div style={{ padding: '12px' }}>

          {/* 클럽장 양도 */}
          <div style={{ background: C.surface, borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTransfer ? 12 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>👑 클럽장 양도</div>
              <button onClick={() => { setShowTransfer(s => !s); setSelectedNewLeader('') }} style={{
                padding: '5px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: showTransfer ? C.surfaceAlt : C.warnBg, color: showTransfer ? C.text2 : C.warn,
              }}>{showTransfer ? '취소' : '양도하기'}</button>
            </div>
            {showTransfer && (
              <div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 10 }}>양도받을 회원을 선택하세요. 양도 후 클럽장 권한이 이전됩니다.</div>
                <select value={selectedNewLeader} onChange={e => setSelectedNewLeader(e.target.value)} style={{ ...iSt, marginBottom: 10, cursor: 'pointer' }}>
                  <option value="">회원 선택</option>
                  {members.filter(m => m.id !== club.leader_id).map(m => (
                    <option key={m.id} value={m.id}>{m.nickname}</option>
                  ))}
                </select>
                <button onClick={handleTransferLeader} disabled={!selectedNewLeader || transferring} style={{
                  width: '100%', padding: '11px', border: 'none', borderRadius: 10, cursor: selectedNewLeader ? 'pointer' : 'default',
                  background: selectedNewLeader ? C.warn : C.surfaceAlt,
                  color: selectedNewLeader ? '#fff' : C.text3,
                  fontSize: 13, fontWeight: 700,
                }}>
                  {transferring ? '양도 중...' : '👑 클럽장 양도 확정'}
                </button>
              </div>
            )}
          </div>

          {/* 클럽 삭제 (관리자 전용) */}
          {isAdmin && (
            <div style={{ background: C.errorBg, borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${C.errorBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.error }}>⚠️ 클럽 삭제</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>삭제 시 모든 클럽 데이터가 제거됩니다.</div>
                </div>
                <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '8px 14px', border: 'none', borderRadius: 10, background: C.error, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  클럽 삭제
                </button>
              </div>
            </div>
          )}

          {/* 삭제 확인 모달 */}
          {showDeleteConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.error, marginBottom: 10 }}>클럽 삭제</div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>
                  <strong style={{ color: C.text }}>{club?.name}</strong> 클럽을 삭제합니다.<br />
                  모든 멤버십, 공지사항 데이터가 삭제되며 복구할 수 없습니다.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '11px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                  <button onClick={handleDeleteClub} disabled={deleting} style={{ flex: 1, padding: '11px', background: C.error, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {deleting ? '삭제 중...' : '삭제 확인'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 가입 신청 대기 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            가입 신청 대기 <span style={{ color: C.warn }}>({pendingMembers.length})</span>
          </div>
          {pendingMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: C.text2, fontSize: 13 }}>대기 중인 신청이 없습니다.</div>
          ) : pendingMembers.map(m => (
            <div key={m.user_id} style={{ background: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.message ? 10 : 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.avatar_color+'22', border: `2px solid ${m.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: m.avatar_color, flexShrink: 0 }}>
                  {m.nickname?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.nickname}</div>
                  <div style={{ fontSize: 10, color: C.text2 }}>{m.applied_at?.slice(0,10)} 신청</div>
                </div>
              </div>
              {m.message && <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: C.text2, fontStyle: 'italic' }}>"{m.message}"</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleMemberStatus(m.user_id, 'rejected')} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 10, background: C.errorBg, color: C.error, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ 거절</button>
                <button onClick={() => handleMemberStatus(m.user_id, 'approved')} style={{ flex: 2, padding: '9px', border: 'none', borderRadius: 10, background: C.successBg, color: C.success, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ 승인</button>
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

const WEEK_DAYS = ['일','월','화','수','목','금','토']
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function TrainingCalendar({ trainings, participants, canManage, membership, onJoin, onLeave, onAttendance, onAbsent, onEdit, onDelete }) {
  const now = new Date()
  const [current, setCurrent] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(null)

  const year = current.getFullYear()
  const month = current.getMonth()
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`
  const todayStr = now.toISOString().slice(0,10)

  const byDay = {}
  trainings.forEach(t => {
    if (t.train_date.startsWith(monthStr)) {
      const day = parseInt(t.train_date.slice(8,10))
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(t)
    }
  })

  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = firstDow                        // 일요일 기준
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i+1)]

  const selectedTrainings = selectedDay ? (byDay[selectedDay] || []) : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => { setCurrent(new Date(year, month-1, 1)); setSelectedDay(null) }}
          style={{ background: C.surfaceAlt, border: 'none', borderRadius: 10, padding: '7px 14px', color: C.text, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{year}년 {MONTH_NAMES[month]}</span>
        <button onClick={() => { setCurrent(new Date(year, month+1, 1)); setSelectedDay(null) }}
          style={{ background: C.surfaceAlt, border: 'none', borderRadius: 10, padding: '7px 14px', color: C.text, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.text2, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 14 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dayTrainings = byDay[day] || []
          const hasTraining = dayTrainings.length > 0
          const isSelected = selectedDay === day
          const dayStr = `${monthStr}-${String(day).padStart(2,'0')}`
          const isToday = dayStr === todayStr

          return (
            <div key={i} onClick={() => hasTraining && setSelectedDay(isSelected ? null : day)} style={{
              minHeight: 52, borderRadius: 10, padding: '4px 3px',
              background: isSelected ? C.accentBg : hasTraining ? C.surfaceAlt : 'transparent',
              border: isSelected ? `1.5px solid ${C.accentBorder}` : '1.5px solid transparent',
              cursor: hasTraining ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: isToday ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: isToday ? 900 : 500, color: isToday ? '#fff' : C.text }}>
                {day}
              </div>
              {dayTrainings.slice(0, 2).map(t => (
                <div key={t.id} style={{ width: '100%', borderRadius: 3, padding: '1px 2px', background: C.accent+'30', fontSize: 8, color: C.accent, fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.train_time ? t.train_time.slice(0,5) : '훈련'}
                </div>
              ))}
              {dayTrainings.length > 2 && <div style={{ fontSize: 8, color: C.text2 }}>+{dayTrainings.length-2}</div>}
            </div>
          )
        })}
      </div>

      {selectedDay && selectedTrainings.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {monthStr}-{String(selectedDay).padStart(2,'0')} 훈련
          </div>
          {selectedTrainings.map(t => {
            const isPast = t.train_date < todayStr
            const parts = participants[t.id] || []
            const isFull = t.capacity > 0 && t.participant_count >= t.capacity
            return (
              <div key={t.id} style={{ background: C.surface, borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderLeft: `4px solid ${isPast ? C.text3 : C.accent}` }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: C.text2, marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {t.train_time && <span>🕐 {t.train_time}</span>}
                        <span>📍 {t.location}</span>
                        <span>👥 {parts.length}{t.capacity > 0 ? `/${t.capacity}` : ''}명</span>
                      </div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button onClick={() => onEdit(t)} style={{ background: C.accentBg, border: 'none', borderRadius: 7, color: C.accent, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 8px' }}>수정</button>
                        <button onClick={() => onDelete(t.id)} style={{ background: C.errorBg, border: 'none', borderRadius: 7, color: C.error, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 8px' }}>삭제</button>
                      </div>
                    )}
                  </div>
                  {t.description && <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>{t.description}</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: parts.length > 0 ? 10 : 0 }}>
                    {t.link_url && <a href={t.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 7, padding: '4px 10px', textDecoration: 'none' }}>🔗 상세보기</a>}
                    {!isPast && membership?.status === 'approved' && (
                      t.my_status ? (
                        <button onClick={() => onLeave(t.id)} style={{ fontSize: 11, fontWeight: 700, color: C.text2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>참가 취소</button>
                      ) : (
                        <button onClick={() => onJoin(t.id)} disabled={isFull} style={{ fontSize: 11, fontWeight: 700, color: isFull ? C.text3 : '#fff', background: isFull ? C.surfaceAlt : C.accent, border: 'none', borderRadius: 7, padding: '4px 10px', cursor: isFull ? 'default' : 'pointer' }}>
                          {isFull ? '마감' : '참가 신청'}
                        </button>
                      )
                    )}
                    {t.my_status === 'attended' && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 5, padding: '2px 7px' }}>✓ 참석</span>}
                    {t.my_status === 'absent' && <span style={{ fontSize: 10, fontWeight: 700, color: C.error, background: C.errorBg, borderRadius: 5, padding: '2px 7px' }}>✗ 불참</span>}
                  </div>
                  {parts.length > 0 && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6 }}>참가자 {parts.length}명</div>
                      {parts.map(p => (
                        <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: p.avatar_color+'22', border: `1.5px solid ${p.avatar_color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: p.avatar_color, flexShrink: 0 }}>{p.nickname?.charAt(0)}</div>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{p.nickname}</span>
                          {p.status === 'attended' && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 5, padding: '2px 7px' }}>✓ 참석</span>}
                          {p.status === 'absent' && <span style={{ fontSize: 10, fontWeight: 700, color: C.error, background: C.errorBg, borderRadius: 5, padding: '2px 7px' }}>✗ 불참</span>}
                          {p.status === 'joined' && <span style={{ fontSize: 10, color: C.text2 }}>신청</span>}
                          {canManage && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => onAttendance(t.id, p.user_id, p.status)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', background: p.status==='attended' ? C.success : C.successBg, color: p.status==='attended' ? '#fff' : C.success }}>참석</button>
                              <button onClick={() => onAbsent(t.id, p.user_id, p.status)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', background: p.status==='absent' ? C.error : C.errorBg, color: p.status==='absent' ? '#fff' : C.error }}>불참</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
