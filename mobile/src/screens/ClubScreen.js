import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput, Modal, Linking,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { C } from '../utils/theme'
import Avatar from '../components/Avatar'

const REGIONS = ['전체','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']

/* ═══════════════════════════════ 클럽 목록 ═══════════════════════════════ */
export default function ClubScreen() {
  const { user } = useAuth()
  const [mode, setMode]           = useState('my')
  const [region, setRegion]       = useState('전체')
  const [myClubs, setMyClubs]     = useState([])
  const [allClubs, setAllClubs]   = useState([])
  const [leaderApp, setLeaderApp] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name:'', description:'', region:'서울' })
  const [creating, setCreating]   = useState(false)
  const [showRegion, setShowRegion] = useState(false)

  useEffect(() => { loadMy() }, [])
  useEffect(() => { if (mode === 'all') loadAll() }, [mode, region])

  async function loadMy() {
    setLoading(true)
    try {
      const [myData, leaderData] = await Promise.all([api.getMyClubs(), api.getMyLeaderApp()])
      setMyClubs(myData)
      setLeaderApp(leaderData.application)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  async function loadAll() {
    setLoading(true)
    try { setAllClubs(await api.getClubs(region)) }
    catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  async function createClub() {
    if (!createForm.name.trim()) { Alert.alert('오류', '클럽명을 입력하세요.'); return }
    setCreating(true)
    try {
      const club = await api.createClub(createForm)
      setShowCreate(false)
      setCreateForm({ name:'', description:'', region:'서울' })
      await loadMy()
      setSelected(club)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setCreating(false) }
  }

  if (selected) {
    return <ClubDetail clubId={selected.id} user={user} onBack={() => { setSelected(null); loadMy() }} />
  }

  const isAdmin          = user?.role === 'admin'
  const isApprovedLeader = isAdmin || leaderApp?.status === 'approved'
  const canCreate        = isApprovedLeader
  const list             = mode === 'my' ? myClubs : allClubs

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>👥 클럽</Text>
          <Text style={s.sub}>전국 트라이애슬론 클럽</Text>
        </View>
        {canCreate && (
          <TouchableOpacity onPress={() => setShowCreate(v => !v)}
            style={[s.addBtn, showCreate && { backgroundColor: C.surfaceAlt }]}>
            <Text style={[s.addBtnText, showCreate && { color: C.text2 }]}>
              {showCreate ? '취소' : '+ 클럽 만들기'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 클럽 만들기 폼 */}
      {showCreate && (
        <View style={[s.formBox, { margin:12 }]}>
          <Text style={[s.sectionLabel, { marginBottom:12 }]}>새 클럽 만들기</Text>
          <TextInput style={s.input} value={createForm.name} onChangeText={v=>setCreateForm(p=>({...p,name:v}))}
            placeholder="클럽명 *" placeholderTextColor={C.text2} />
          <TouchableOpacity onPress={() => setShowRegion(v=>!v)}
            style={[s.input, { marginTop:8, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }]}>
            <Text style={{ color:C.text, fontSize:13 }}>{createForm.region}</Text>
            <Text style={{ color:C.text2 }}>▾</Text>
          </TouchableOpacity>
          {showRegion && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:6 }}>
              <View style={{ flexDirection:'row', gap:5 }}>
                {REGIONS.filter(r=>r!=='전체').map(r => (
                  <TouchableOpacity key={r} onPress={() => { setCreateForm(p=>({...p,region:r})); setShowRegion(false) }}
                    style={[s.chip, createForm.region===r && s.chipActive]}>
                    <Text style={[s.chipText, createForm.region===r && s.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          <TextInput style={[s.input, { marginTop:8, minHeight:60, textAlignVertical:'top' }]}
            value={createForm.description} onChangeText={v=>setCreateForm(p=>({...p,description:v}))}
            placeholder="클럽 소개 (선택)" placeholderTextColor={C.text2} multiline />
          <TouchableOpacity onPress={createClub} disabled={creating}
            style={[s.saveBtn, { marginTop:10 }, creating && { backgroundColor:C.surfaceHigh }]}>
            <Text style={s.saveBtnText}>{creating ? '생성 중...' : '🏊 클럽 만들기'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.modeRow}>
        {['my','all'].map(m => (
          <TouchableOpacity key={m} onPress={() => setMode(m)} style={[s.modeTab, mode===m && s.modeTabActive]}>
            <Text style={[s.modeTabText, mode===m && s.modeTabTextActive]}>{m==='my' ? '내 클럽' : '전체 클럽'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'all' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.regionRow}>
          {REGIONS.map(r => (
            <TouchableOpacity key={r} onPress={() => setRegion(r)} style={[s.chip, region===r && s.chipActive]}>
              <Text style={[s.chipText, region===r && s.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {loading ? <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>
      : list.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
          <Text style={s.emptyText}>{mode==='my' ? '가입된 클럽이 없습니다' : '등록된 클럽이 없습니다'}</Text>
        </View>
      ) : (
        <FlatList data={list} keyExtractor={c => String(c.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: club }) => (
            <TouchableOpacity onPress={() => setSelected(club)} style={s.clubCard}>
              <View style={s.clubCardInner}>
                {/* 상단: 지역 배지 + 내 클럽 표시 */}
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:4 }}>
                  {club.region ? (
                    <View style={s.regionBadge}>
                      <Text style={s.regionBadgeText}>{club.region}</Text>
                    </View>
                  ) : null}
                  {club.leader_id === user?.id && (
                    <View style={[s.regionBadge, { backgroundColor:'#FBBF2422', borderColor:'#FBBF2460' }]}>
                      <Text style={[s.regionBadgeText, { color:'#FBBF24' }]}>내 클럽</Text>
                    </View>
                  )}
                </View>
                {/* 클럽명 + 회원수 */}
                <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between' }}>
                  <Text style={[s.clubName, { flex:1 }]}>{club.name}</Text>
                  {club.member_count > 0 && (
                    <View style={{ alignItems:'flex-end', marginLeft:8 }}>
                      <Text style={s.clubMemberCount}>{club.member_count}</Text>
                      <Text style={s.clubMemberLabel}>회원</Text>
                    </View>
                  )}
                </View>
                {/* 설명 */}
                {club.description ? <Text style={s.clubDesc} numberOfLines={1}>{club.description}</Text> : null}
                {/* 클럽장 */}
                {club.leader_name && (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:8 }}>
                    <Avatar nickname={club.leader_name} avatar_color={club.leader_color} avatar_image={club.leader_image} size={22} />
                    <Text style={s.clubSub}>클럽장 {club.leader_name}</Text>
                    <View style={{ flex:1 }} />
                    <Text style={{ color:C.text2, fontSize:16 }}>›</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ═══════════════════════════════ 클럽 상세 ═══════════════════════════════ */
function ClubDetail({ clubId, user, onBack }) {
  const [club, setClub]             = useState(null)
  const [membership, setMembership] = useState({ status: null })
  const [members, setMembers]       = useState([])
  const [pending, setPending]       = useState([])
  const [announcements, setAnn]     = useState([])
  const [trainings, setTrainings]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('훈련')
  const [showEdit, setShowEdit]     = useState(false)
  const [editForm, setEditForm]     = useState({ name:'', description:'', region:'' })
  const [editSaving, setEditSaving] = useState(false)
  const [showRegion, setShowRegion] = useState(false)

  const isLeader   = club?.leader_id === user?.id
  const isAdmin    = user?.role === 'admin'
  const canManage  = isLeader || isAdmin
  const isApproved = membership?.status === 'approved'
  const canSee     = isApproved || canManage

  const TABS = ['공지사항', '훈련', '회원', ...(canManage ? ['관리'] : [])]

  useEffect(() => { load() }, [clubId])

  async function load() {
    setLoading(true)
    try {
      const [clubData, memData, annData] = await Promise.all([
        api.getClub(clubId),
        api.getClubMembership(clubId),
        api.getClubAnnouncements(clubId),
      ])
      setClub(clubData)
      setMembership(memData)
      setAnn(annData)
      setEditForm({ name: clubData.name||'', description: clubData.description||'', region: clubData.region||'' })
      const approved = memData?.status === 'approved' || clubData.leader_id === user?.id || user?.role === 'admin'
      if (approved) {
        const [mems, trs] = await Promise.all([api.getClubMembers(clubId), api.getClubTrainings(clubId)])
        setMembers(mems)
        setTrainings(trs)
      }
      if (clubData.leader_id === user?.id || user?.role === 'admin') {
        const pend = await api.getClubPendingMembers(clubId).catch(() => [])
        setPending(pend)
      }
    } catch {}
    finally { setLoading(false) }
  }

  async function saveClub() {
    if (!editForm.name.trim()) { Alert.alert('오류', '클럽명을 입력하세요.'); return }
    setEditSaving(true)
    try {
      const updated = await api.updateClub(clubId, editForm)
      setClub(updated)
      setShowEdit(false)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setEditSaving(false) }
  }

  async function deleteClub() {
    Alert.alert('클럽 삭제', `${club?.name} 클럽을 삭제합니다.\n모든 데이터가 삭제되며 복구할 수 없습니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try { await api.deleteClub(clubId); onBack() }
        catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  async function join(message = '') {
    try {
      await api.joinClubById(clubId, message)
      Alert.alert('신청 완료', '가입 신청이 접수되었습니다.')
      load()
    } catch (e) { Alert.alert('오류', e.message) }
  }

  async function leave() {
    Alert.alert('탈퇴', '클럽을 탈퇴할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: async () => {
        try { await api.leaveClubById(clubId); onBack() }
        catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  if (loading) return <View style={[s.root, s.center]}><ActivityIndicator color={C.accent} size="large" /></View>

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.detailHeader}>
        <TouchableOpacity onPress={onBack}><Text style={s.backText}>← 뒤로</Text></TouchableOpacity>
        <Text style={s.detailTitle} numberOfLines={1}>{club?.name}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 클럽 정보 카드 */}
      <View style={s.clubInfoCard}>
        <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between' }}>
          <View style={{ flex:1 }}>
            <Text style={s.clubInfoName}>{club?.name}</Text>
            {club?.description ? <Text style={[s.clubDesc, { marginTop:4 }]}>{club.description}</Text> : null}
          </View>
          {canManage && (
            <TouchableOpacity onPress={() => { setShowEdit(v=>!v); setShowRegion(false) }}
              style={[s.smBtn, showEdit && { backgroundColor:C.surfaceAlt }, !showEdit && { backgroundColor:C.accentBg, borderWidth:1, borderColor:C.border }]}>
              <Text style={[s.smBtnText, !showEdit && { color:C.accent }]}>{showEdit ? '취소' : '✏️ 수정'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
          {canSee && (
            <View style={{ flexDirection:'row', alignItems:'baseline', gap:3 }}>
              <Text style={s.clubInfoStat}>{members.length}</Text>
              <Text style={s.clubSub}>회원</Text>
              {pending.length > 0 && canManage && (
                <View style={{ backgroundColor:'#F59E0B22', borderRadius:6, paddingHorizontal:6, paddingVertical:1, marginLeft:4 }}>
                  <Text style={{ fontSize:10, color:'#F59E0B', fontWeight:'700' }}>대기 {pending.length}</Text>
                </View>
              )}
            </View>
          )}
          {club?.region ? <Text style={s.clubSub}>📍 {club.region}</Text> : null}
          {club?.leader_name ? (
            <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
              <Avatar nickname={club.leader_name} avatar_color={club.leader_color} avatar_image={club.leader_image} size={18} />
              <Text style={s.clubSub}>클럽장 {club.leader_name}</Text>
            </View>
          ) : null}
        </View>

        {/* 가입 신청 */}
        {!isLeader && !isAdmin && (
          <View style={{ marginTop:12, borderTopWidth:1, borderTopColor:C.border, paddingTop:12 }}>
            {membership?.status === 'approved' ? (
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <Text style={{ fontSize:13, fontWeight:'700', color:C.success }}>✅ 가입된 클럽</Text>
                <TouchableOpacity onPress={leave} style={[s.joinBtn, { borderColor:C.errorBorder }]}>
                  <Text style={[s.joinBtnText, { color:C.error }]}>탈퇴</Text>
                </TouchableOpacity>
              </View>
            ) : membership?.status === 'pending' ? (
              <Text style={{ fontSize:13, fontWeight:'600', color:'#F59E0B' }}>⏳ 클럽장 승인 대기 중</Text>
            ) : (
              <TouchableOpacity onPress={() => join()} style={[s.saveBtn, { marginTop:0 }]}>
                <Text style={s.saveBtnText}>🙋 클럽 가입 신청</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 클럽 편집 폼 (수정 버튼 클릭 시) */}
      {showEdit && (
        <View style={[s.formBox, { margin:12, marginBottom:4 }]}>
          <TextInput style={s.input} value={editForm.name} onChangeText={v=>setEditForm(p=>({...p,name:v}))} placeholder="클럽명 *" placeholderTextColor={C.text2} />
          <TouchableOpacity onPress={() => setShowRegion(v=>!v)}
            style={[s.input, { marginTop:8, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }]}>
            <Text style={{ color:editForm.region ? C.text : C.text2, fontSize:13 }}>{editForm.region || '지역 선택'}</Text>
            <Text style={{ color:C.text2 }}>▾</Text>
          </TouchableOpacity>
          {showRegion && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:6 }}>
              <View style={{ flexDirection:'row', gap:6 }}>
                {REGIONS.filter(r=>r!=='전체').map(r => (
                  <TouchableOpacity key={r} onPress={() => { setEditForm(p=>({...p,region:r})); setShowRegion(false) }}
                    style={[s.smBtn, editForm.region===r && { backgroundColor:C.accent+'22', borderWidth:1, borderColor:C.border }]}>
                    <Text style={[s.smBtnText, editForm.region===r && { color:C.accent }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          <TextInput style={[s.input, { marginTop:8, minHeight:60, textAlignVertical:'top' }]}
            value={editForm.description} onChangeText={v=>setEditForm(p=>({...p,description:v}))}
            placeholder="클럽 소개" placeholderTextColor={C.text2} multiline />
          <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
            <TouchableOpacity onPress={deleteClub} style={[s.cancelBtn, { backgroundColor:C.errorBg, borderWidth:1, borderColor:C.errorBorder }]}>
              <Text style={[s.cancelBtnText, { color:C.error }]}>🗑️ 삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveClub} disabled={editSaving} style={[s.saveBtn, editSaving && { backgroundColor:C.surfaceHigh }]}>
              <Text style={s.saveBtnText}>{editSaving ? '저장 중...' : '💾 저장'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 탭 */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab===t && s.tabActive]}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === '공지사항' && <AnnTab clubId={clubId} items={announcements} setItems={setAnn} canManage={canManage} user={user} />}
      {tab === '훈련'    && <TrainingTab clubId={clubId} trainings={trainings} setTrainings={setTrainings} canManage={canManage} isApproved={canSee} user={user} />}
      {tab === '회원'    && <MembersTab members={members} setMembers={setMembers} clubId={clubId} canManage={canManage} user={user} club={club} />}
      {canManage && tab === '관리' && <ManageTab club={club} setClub={setClub} clubId={clubId} members={members} pending={pending} setPending={setPending} onBack={onBack} user={user} />}
    </View>
  )
}

/* ─── 공지사항 탭 ─── */
function AnnTab({ clubId, items, setItems, canManage, user }) {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function post() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    try {
      const row = await api.postClubAnnouncement(clubId, { title, body })
      setItems(prev => [row, ...prev])
      setTitle(''); setBody(''); setShowForm(false)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    Alert.alert('삭제', '공지사항을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try { await api.deleteClubAnnouncement(clubId, id); setItems(prev => prev.filter(a => a.id !== id)) }
        catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      {canManage && (
        showForm ? (
          <View style={s.formBox}>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="제목" placeholderTextColor={C.text2} />
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top', marginTop: 8 }]}
              value={body} onChangeText={setBody} placeholder="내용" placeholderTextColor={C.text2} multiline />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShowForm(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity onPress={post} disabled={saving} style={[s.saveBtn, saving && { backgroundColor: C.surfaceHigh }]}>
                <Text style={s.saveBtnText}>{saving ? '저장 중...' : '게시'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowForm(true)} style={s.addRowBtn}>
            <Text style={s.addRowBtnText}>+ 공지 작성</Text>
          </TouchableOpacity>
        )
      )}
      {items.length === 0
        ? <Text style={[s.emptyText, { textAlign: 'center', marginTop: 32 }]}>공지사항이 없습니다</Text>
        : items.map(a => (
          <View key={a.id} style={s.annCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={s.annTitle}>{a.title}</Text>
              {canManage && (
                <TouchableOpacity onPress={() => del(a.id)}>
                  <Text style={{ color: C.error, fontSize: 12, fontWeight: '700' }}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.annDate}>{a.created_at?.slice(0,10)}</Text>
            <Text style={s.annBody}>{a.body}</Text>
          </View>
        ))
      }
    </ScrollView>
  )
}

/* ─── 훈련 탭 (달력 뷰) ─── */
function TrainingTab({ clubId, trainings, setTrainings, canManage, isApproved, user }) {
  const now = new Date()
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth())
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', train_date:'', train_time:'', location:'', description:'', capacity:'' })
  const [saving, setSaving] = useState(false)

  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAYS   = ['일','월','화','수','목','금','토']
  const today  = now.toISOString().slice(0,10)

  // 달력 그리드
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = Array(Math.ceil((firstDow + daysInMonth) / 7) * 7).fill(null)
  for (let i = 0; i < daysInMonth; i++) cells[firstDow + i] = i + 1

  // 날짜별 훈련 맵
  const byDate = {}
  trainings.forEach(t => {
    if (!byDate[t.train_date]) byDate[t.train_date] = []
    byDate[t.train_date].push(t)
  })

  function prevMonth() {
    if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1)
    setSelected(null)
  }

  const selDate = selected
    ? `${year}-${String(month+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}`
    : null
  const selTrainings = selDate ? (byDate[selDate] || []) : []

  async function save() {
    if (!form.title.trim() || !form.train_date || !form.location.trim()) {
      Alert.alert('오류', '제목, 날짜, 장소는 필수입니다.'); return
    }
    setSaving(true)
    try {
      const row = await api.createClubTraining(clubId, { ...form, capacity: parseInt(form.capacity)||0 })
      setTrainings(prev => [...prev, row].sort((a,b) => a.train_date.localeCompare(b.train_date)))
      setForm({ title:'', train_date:'', train_time:'', location:'', description:'', capacity:'' })
      setShowForm(false)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setSaving(false) }
  }

  async function joinT(tid) {
    try {
      await api.joinClubTraining(clubId, tid)
      setTrainings(prev => prev.map(t => t.id===tid ? { ...t, my_status:'joined', participant_count:(t.participant_count||0)+1 } : t))
    } catch (e) { Alert.alert('오류', e.message) }
  }

  async function leaveT(tid) {
    try {
      await api.leaveClubTraining(clubId, tid)
      setTrainings(prev => prev.map(t => t.id===tid ? { ...t, my_status:null, participant_count:Math.max(0,(t.participant_count||1)-1) } : t))
    } catch (e) { Alert.alert('오류', e.message) }
  }

  async function delT(tid) {
    Alert.alert('삭제', '훈련을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try { await api.deleteClubTraining(clubId, tid); setTrainings(prev => prev.filter(t => t.id!==tid)) }
        catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      {/* 달력 */}
      <View style={s.calBox}>
        {/* 월 네비 */}
        <View style={s.calNav}>
          <TouchableOpacity onPress={prevMonth} style={s.calNavBtn}><Text style={s.calNavBtnText}>‹</Text></TouchableOpacity>
          <Text style={s.calNavTitle}>{year}년 {MONTHS[month]}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.calNavBtn}><Text style={s.calNavBtnText}>›</Text></TouchableOpacity>
        </View>
        {/* 요일 헤더 */}
        <View style={s.calDayRow}>
          {DAYS.map((d,i) => (
            <Text key={d} style={[s.calDayLabel, { color: i===0 ? '#EF4444' : i===6 ? C.accent : C.text2 }]}>{d}</Text>
          ))}
        </View>
        {/* 날짜 그리드 */}
        <View style={s.calGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={s.calCell} />
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const dayTrainings = byDate[dateStr] || []
            const isToday  = dateStr === today
            const isSel    = selected === day
            const dow      = i % 7
            return (
              <TouchableOpacity key={i} onPress={() => setSelected(isSel ? null : day)}
                style={[s.calCell, isSel && s.calCellSel, isToday && !isSel && s.calCellToday]}>
                <Text style={[s.calCellText,
                  isSel && { color:'#fff', fontWeight:'800' },
                  !isSel && isToday && { color:C.accent, fontWeight:'800' },
                  !isSel && !isToday && dow===0 && { color:'#EF4444' },
                  !isSel && !isToday && dow===6 && { color:C.accent },
                ]}>{day}</Text>
                {/* 훈련 있는 날 점 표시 */}
                {dayTrainings.length > 0 && (
                  <View style={{ flexDirection:'row', gap:2, marginTop:2, justifyContent:'center' }}>
                    {dayTrainings.slice(0,3).map((_,j) => (
                      <View key={j} style={[s.calDot, isSel && { backgroundColor:'rgba(255,255,255,0.8)' }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* 선택 날짜 훈련 목록 */}
      {selDate && (
        <View style={{ paddingHorizontal:14, marginTop:4 }}>
          <Text style={[s.sectionLabel, { marginBottom:8 }]}>{selDate} 훈련</Text>
          {selTrainings.length === 0
            ? <Text style={[s.emptyText, { textAlign:'center', paddingVertical:16 }]}>이 날 훈련이 없습니다</Text>
            : selTrainings.map(t => (
              <TrainingCard key={t.id} t={t} canManage={canManage} isApproved={isApproved}
                onJoin={joinT} onLeave={leaveT} onDelete={delT}
                isPast={t.train_date < today} clubId={clubId} />
            ))
          }
        </View>
      )}

      {/* 훈련 등록 버튼 & 폼 */}
      {canManage && (
        <View style={{ paddingHorizontal:14, marginTop:8 }}>
          {showForm ? (
            <View style={s.formBox}>
              <Text style={[s.sectionLabel, { marginBottom:10 }]}>훈련 등록</Text>
              <TextInput style={s.input} value={form.title} onChangeText={v=>setForm(p=>({...p,title:v}))} placeholder="훈련 제목 *" placeholderTextColor={C.text2} />
              <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                <TextInput style={[s.input,{flex:1}]} value={form.train_date} onChangeText={v=>setForm(p=>({...p,train_date:v}))} placeholder="날짜 YYYY-MM-DD *" placeholderTextColor={C.text2} />
                <TextInput style={[s.input,{flex:1}]} value={form.train_time} onChangeText={v=>setForm(p=>({...p,train_time:v}))} placeholder="시간 HH:MM" placeholderTextColor={C.text2} />
              </View>
              <TextInput style={[s.input,{marginTop:8}]} value={form.location} onChangeText={v=>setForm(p=>({...p,location:v}))} placeholder="장소 *" placeholderTextColor={C.text2} />
              <TextInput style={[s.input,{marginTop:8}]} value={form.description} onChangeText={v=>setForm(p=>({...p,description:v}))} placeholder="설명 (선택)" placeholderTextColor={C.text2} />
              <TextInput style={[s.input,{marginTop:8}]} value={form.capacity} onChangeText={v=>setForm(p=>({...p,capacity:v}))} placeholder="모집 인원 (0=무제한)" placeholderTextColor={C.text2} keyboardType="number-pad" />
              <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
                <TouchableOpacity onPress={() => setShowForm(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>취소</Text></TouchableOpacity>
                <TouchableOpacity onPress={save} disabled={saving} style={[s.saveBtn, saving && {backgroundColor:C.surfaceHigh}]}>
                  <Text style={s.saveBtnText}>{saving ? '저장 중...' : '등록'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowForm(true)} style={s.addRowBtn}>
              <Text style={s.addRowBtnText}>+ 훈련 등록</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  )
}

function TrainingCard({ t, canManage, isApproved, onJoin, onLeave, onDelete, isPast, clubId }) {
  const isFull = t.capacity > 0 && (t.participant_count||0) >= t.capacity
  const [participants, setParticipants] = useState(null)
  const [loadingP, setLoadingP] = useState(false)
  const [showP, setShowP] = useState(false)

  async function toggleParticipants() {
    if (showP) { setShowP(false); return }
    setShowP(true)
    if (participants !== null) return
    setLoadingP(true)
    try { setParticipants(await api.getTrainingParticipants(clubId, t.id)) }
    catch {}
    finally { setLoadingP(false) }
  }

  return (
    <View style={[s.trainingCard, isPast && { opacity:0.7 }]}>
      {/* 제목 + 삭제 */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
        <Text style={s.trainingTitle}>{t.title}</Text>
        {canManage && (
          <TouchableOpacity onPress={() => onDelete(t.id)}>
            <Text style={{ color:C.error, fontSize:12, fontWeight:'700' }}>삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      {t.train_time ? <Text style={s.trainingSub}>⏰ {t.train_time}</Text> : null}
      <Text style={s.trainingSub}>📍 {t.location}</Text>
      {t.description ? <Text style={[s.trainingSub, { marginTop:4, fontStyle:'italic' }]}>{t.description}</Text> : null}

      {/* 액션 바 */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:10, flexWrap:'wrap' }}>
        {/* 상세보기 링크 */}
        {t.link_url ? (
          <TouchableOpacity onPress={() => Linking.openURL(t.link_url)}
            style={[s.joinBtn, { backgroundColor:C.accent+'18', borderColor:C.border }]}>
            <Text style={[s.joinBtnText, { color:C.accent }]}>🔗 상세보기</Text>
          </TouchableOpacity>
        ) : null}

        {/* 참가 신청/취소 */}
        {isApproved && !isPast && (
          t.my_status === 'joined'
            ? <TouchableOpacity onPress={() => onLeave(t.id)} style={[s.joinBtn, { borderColor:C.errorBorder }]}>
                <Text style={[s.joinBtnText, { color:C.error }]}>참가 취소</Text>
              </TouchableOpacity>
            : <TouchableOpacity onPress={() => !isFull && onJoin(t.id)}
                style={[s.joinBtn, isFull && { opacity:0.4 }]}>
                <Text style={s.joinBtnText}>{isFull ? '마감' : '참가 신청'}</Text>
              </TouchableOpacity>
        )}

        {/* 참가자 보기 버튼 */}
        <TouchableOpacity onPress={toggleParticipants} style={[s.joinBtn, showP && { backgroundColor:C.accent+'18' }]}>
          <Text style={[s.joinBtnText, showP && { color:C.accent }]}>
            👥 {t.participant_count||0}명{t.capacity>0 ? `/${t.capacity}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 참가자 명단 */}
      {showP && (
        <View style={s.participantBox}>
          {loadingP
            ? <ActivityIndicator color={C.accent} size="small" />
            : !participants || participants.length === 0
              ? <Text style={[s.trainingSub, { textAlign:'center' }]}>신청자가 없습니다</Text>
              : participants.map(p => (
                <View key={p.user_id} style={s.participantRow}>
                  <Avatar nickname={p.nickname} avatar_color={p.avatar_color} avatar_image={p.avatar_image} size={28} />
                  <Text style={[s.trainingSub, { flex:1, color:C.text, fontWeight:'600', marginTop:0 }]}>{p.nickname}</Text>
                  {p.status === 'attended' && <View style={[s.statusPill, { backgroundColor:C.success+'20' }]}><Text style={[s.statusPillText, { color:C.success }]}>✓ 참석</Text></View>}
                  {p.status === 'absent'   && <View style={[s.statusPill, { backgroundColor:C.error+'20'  }]}><Text style={[s.statusPillText, { color:C.error   }]}>✗ 불참</Text></View>}
                  {p.status === 'joined'   && <Text style={[s.trainingSub, { marginTop:0 }]}>신청</Text>}
                </View>
              ))
          }
        </View>
      )}
    </View>
  )
}

/* ─── 회원 탭 ─── */
function MembersTab({ members, setMembers, clubId, canManage, user, club }) {
  async function toggleSubLeader(m) {
    const newRole = m.club_role === 'sub_leader' ? 'member' : 'sub_leader'
    Alert.alert('역할 변경', `${m.nickname}을(를) ${newRole === 'sub_leader' ? '부클럽장' : '일반회원'}으로 변경할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '변경', onPress: async () => {
        try {
          await api.setClubMemberClubRole(clubId, m.user_id || m.id, newRole)
          setMembers(prev => prev.map(x => (x.user_id || x.id) === (m.user_id || m.id) ? { ...x, club_role: newRole } : x))
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  async function kickMember(m) {
    Alert.alert('강제 탈퇴', `${m.nickname} 회원을 탈퇴시킬까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: async () => {
        try {
          await api.setClubMemberStatus(clubId, m.user_id || m.id, 'rejected')
          setMembers(prev => prev.filter(x => (x.user_id || x.id) !== (m.user_id || m.id)))
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  // API가 이미 승인된 회원만 반환하므로 그대로 사용
  const approved = members.length > 0 && members[0]?.status !== undefined
    ? members.filter(m => m.status === 'approved')
    : members

  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      {/* 승인 회원 */}
      <Text style={s.sectionLabel}>회원 {approved.length}명</Text>
      {approved.length === 0
        ? <Text style={[s.emptyText, { textAlign:'center', marginTop:16 }]}>회원이 없습니다</Text>
        : approved.map(m => {
          const mid = m.user_id || m.id
          const isLeader = mid === club?.leader_id
          const isMe = mid === user?.id
          return (
            <View key={mid} style={s.memberRow}>
              <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={38} />
              <View style={{ flex:1 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <Text style={[s.memberNick, isMe && { color:C.accent }]}>{m.nickname}</Text>
                  {isLeader && <View style={[s.badge, { backgroundColor:'#FBBF2422' }]}><Text style={[s.badgeText, { color:'#FBBF24' }]}>👑 리더</Text></View>}
                  {m.club_role === 'sub_leader' && !isLeader && <View style={[s.badge, { backgroundColor:C.accent+'22' }]}><Text style={[s.badgeText, { color:C.accent }]}>부클럽장</Text></View>}
                </View>
              </View>
              {canManage && !isLeader && !isMe && (
                <View style={{ flexDirection:'row', gap:4 }}>
                  <TouchableOpacity onPress={() => toggleSubLeader(m)} style={s.smBtn}>
                    <Text style={s.smBtnText}>{m.club_role === 'sub_leader' ? '해제' : '부클럽장'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => kickMember(m)} style={[s.smBtn, { backgroundColor:C.errorBg }]}>
                    <Text style={[s.smBtnText, { color:C.error }]}>탈퇴</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })
      }
    </ScrollView>
  )
}

/* ─── 관리 탭 ─── */
function ManageTab({ club, setClub, clubId, members, pending, setPending, onBack, user }) {
  const [newLeaderId, setNewLeaderId]   = useState('')
  const [transferring, setTransferring] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [deleting, setDeleting]         = useState(false)

  async function deleteClub() {
    Alert.alert('클럽 삭제', `${club?.name} 클럽을 삭제합니다.\n모든 데이터가 삭제되며 복구할 수 없습니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        setDeleting(true)
        try { await api.deleteClub(clubId); onBack() }
        catch (e) { Alert.alert('오류', e.message) }
        finally { setDeleting(false) }
      }},
    ])
  }

  const approvedMembers = members.filter(m => {
    const mid = m.user_id || m.id
    return mid !== club?.leader_id && mid !== user?.id && (m.status === 'approved' || m.status === undefined)
  })

  async function transferLeader() {
    if (!newLeaderId) { Alert.alert('오류', '새 리더를 선택하세요.'); return }
    const target = approvedMembers.find(m => String(m.user_id || m.id) === newLeaderId)
    Alert.alert('리더 위임', `${target?.nickname}에게 클럽장을 위임할까요?\n위임 후 본인은 일반 회원이 됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '위임', style: 'destructive', onPress: async () => {
        setTransferring(true)
        try {
          await api.transferClubLeader(clubId, Number(newLeaderId))
          Alert.alert('완료', '클럽장이 위임되었습니다.', [{ text: '확인', onPress: onBack }])
        } catch (e) { Alert.alert('오류', e.message) }
        finally { setTransferring(false) }
      }},
    ])
  }

  async function approve(m) {
    try {
      await api.setClubMemberStatus(clubId, m.user_id, 'approved')
      setPending(prev => prev.filter(x => x.user_id !== m.user_id))
    } catch (e) { Alert.alert('오류', e.message) }
  }

  async function reject(userId) {
    try {
      await api.setClubMemberStatus(clubId, userId, 'rejected')
      setPending(prev => prev.filter(m => m.user_id !== userId))
    } catch (e) { Alert.alert('오류', e.message) }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      {/* 가입 신청 대기 */}
      <Text style={s.sectionLabel}>
        가입 신청 대기 <Text style={{ color: pending.length > 0 ? '#F59E0B' : C.text2 }}>({pending.length})</Text>
      </Text>
      {pending.length === 0
        ? <Text style={[s.emptyText, { marginBottom:16 }]}>대기 중인 신청이 없습니다</Text>
        : pending.map(m => (
          <View key={m.user_id} style={[s.formBox, { marginBottom:10, padding:12 }]}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom: m.message ? 10 : 0 }}>
              <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={38} />
              <View style={{ flex:1 }}>
                <Text style={s.memberNick}>{m.nickname}</Text>
                <Text style={s.memberSub}>{m.applied_at?.slice(0,10)} 신청</Text>
              </View>
            </View>
            {m.message ? (
              <View style={{ backgroundColor:C.surfaceAlt, borderRadius:8, padding:'8px 10px', paddingHorizontal:10, paddingVertical:8, marginBottom:10 }}>
                <Text style={[s.memberSub, { fontStyle:'italic' }]}>"{m.message}"</Text>
              </View>
            ) : null}
            <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
              <TouchableOpacity onPress={() => reject(m.user_id)} style={[s.cancelBtn, { backgroundColor:C.errorBg }]}>
                <Text style={[s.cancelBtnText, { color:C.error }]}>✕ 거절</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => approve(m)} style={[s.saveBtn, { backgroundColor:'#10B98120', flex:2 }]}>
                <Text style={[s.saveBtnText, { color:'#10B981' }]}>✓ 승인</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      }

      <View style={s.divider} />

      {/* 클럽장 양도 */}
      <View style={[s.formBox, { marginTop:20 }]}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={s.memberNick}>👑 클럽장 양도</Text>
          <TouchableOpacity onPress={() => { setShowTransfer(v=>!v); setNewLeaderId('') }}
            style={[s.smBtn, showTransfer && { backgroundColor:C.surfaceAlt }]}>
            <Text style={[s.smBtnText, !showTransfer && { color:'#F59E0B' }]}>{showTransfer ? '취소' : '양도하기'}</Text>
          </TouchableOpacity>
        </View>
        {showTransfer && (
          <>
            <Text style={[s.memberSub, { marginTop:10, marginBottom:8 }]}>양도받을 회원을 선택하세요. 양도 후 클럽장 권한이 이전됩니다.</Text>
            {approvedMembers.length === 0
              ? <Text style={s.memberSub}>양도 가능한 회원이 없습니다.</Text>
              : approvedMembers.map(m => {
                const mid = String(m.user_id || m.id)
                return (
                  <TouchableOpacity key={mid} onPress={() => setNewLeaderId(mid)}
                    style={[s.memberRow, newLeaderId===mid && { backgroundColor:C.accent+'12', borderRadius:10, paddingHorizontal:6 }]}>
                    <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={32} />
                    <Text style={[s.memberNick, { flex:1 }]}>{m.nickname}</Text>
                    {newLeaderId===mid && <Text style={{ color:C.accent, fontSize:16 }}>✓</Text>}
                  </TouchableOpacity>
                )
              })
            }
            <TouchableOpacity onPress={transferLeader} disabled={transferring || !newLeaderId}
              style={[s.saveBtn, { marginTop:12, backgroundColor: newLeaderId ? '#F59E0B' : C.surfaceHigh }]}>
              <Text style={s.saveBtnText}>{transferring ? '양도 중...' : '👑 클럽장 양도 확정'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={s.divider} />

      {/* 클럽 삭제 */}
      <View style={[s.formBox, { marginTop:20, borderColor:C.errorBorder, backgroundColor:C.errorBg }]}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View>
            <Text style={[s.memberNick, { color:C.error }]}>🗑️ 클럽 삭제</Text>
            <Text style={[s.memberSub, { marginTop:3 }]}>삭제 시 모든 데이터가 영구 제거됩니다.</Text>
          </View>
          <TouchableOpacity onPress={deleteClub} disabled={deleting}
            style={[s.smBtn, { backgroundColor:C.error }]}>
            <Text style={[s.smBtnText, { color:'#fff' }]}>{deleting ? '삭제 중...' : '삭제'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height:40 }} />
    </ScrollView>
  )
}

/* ─── 스타일 ─── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex:1, alignItems:'center', justifyContent:'center', padding:32 },
  emptyText: { color: C.text2, fontSize: 14 },

  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:C.surface, borderBottomWidth:1, borderBottomColor:C.border, paddingHorizontal:16, paddingVertical:12 },
  title: { fontSize:15, fontWeight:'800', color:C.text },
  sub: { fontSize:11, color:C.text2, marginTop:2 },
  addBtn: { backgroundColor:C.accent, borderRadius:100, paddingHorizontal:14, paddingVertical:7 },
  addBtnText: { fontSize:12, fontWeight:'700', color:'#fff' },

  modeRow: { flexDirection:'row', backgroundColor:C.surface, borderBottomWidth:1, borderBottomColor:C.border },
  modeTab: { flex:1, paddingVertical:11, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  modeTabActive: { borderBottomColor:'#A855F7' },
  modeTabText: { fontSize:13, fontWeight:'700', color:C.text2 },
  modeTabTextActive: { color:'#A855F7' },

  regionRow: { flexDirection:'row', gap:4, paddingHorizontal:12, paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border },
  chip: { paddingHorizontal:10, paddingVertical:3, backgroundColor:C.surfaceAlt, borderRadius:6, borderWidth:1, borderColor:C.border },
  chipActive: { backgroundColor:'#A855F720', borderColor:'#A855F760' },
  chipText: { fontSize:12, fontWeight:'600', color:C.text2 },
  chipTextActive: { color:'#A855F7' },

  clubCard: { backgroundColor:C.surface, borderRadius:16, borderWidth:1, borderColor:C.border, borderLeftWidth:4, borderLeftColor:'#A855F7', marginBottom:10, overflow:'hidden' },
  clubCardInner: { padding:14 },
  clubIcon: { width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center' },
  clubIconSm: { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center', marginRight:10 },
  clubIconText: { fontSize:18, fontWeight:'800', color:'#A855F7' },
  clubName: { fontSize:15, fontWeight:'800', color:C.text, lineHeight:20 },
  clubMemberCount: { fontSize:18, fontWeight:'900', color:'#A855F7' },
  clubMemberLabel: { fontSize:9, color:C.text2 },
  clubSub: { fontSize:11, color:C.text2, marginTop:2 },
  clubDesc: { fontSize:12, color:C.text2, marginTop:3 },
  regionBadge: { backgroundColor:'#A855F720', borderWidth:1, borderColor:'#A855F760', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
  regionBadgeText: { fontSize:10, fontWeight:'700', color:'#A855F7' },
  leaderAvatar: { width:22, height:22, borderRadius:11, borderWidth:1.5, alignItems:'center', justifyContent:'center' },
  leaderAvatarText: { fontSize:9, fontWeight:'800' },

  detailHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:C.surface, borderBottomWidth:1, borderBottomColor:C.border, paddingHorizontal:16, paddingVertical:12 },
  backText: { fontSize:13, fontWeight:'700', color:C.accent },
  detailTitle: { fontSize:15, fontWeight:'800', color:C.text, flex:1, textAlign:'center' },

  clubInfoBar: { flexDirection:'row', alignItems:'center', backgroundColor:C.surface, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border },
  clubInfoCard: { backgroundColor:C.surface, borderBottomWidth:1, borderBottomColor:C.border, paddingHorizontal:16, paddingVertical:14 },
  clubInfoName: { fontSize:20, fontWeight:'900', color:C.text, letterSpacing:-0.5 },
  clubInfoStat: { fontSize:18, fontWeight:'900', color:C.accent },

  tabRow: { flexDirection:'row', backgroundColor:C.surface, borderBottomWidth:1, borderBottomColor:C.border },
  tab: { flex:1, paddingVertical:11, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive: { borderBottomColor:C.accent },
  tabText: { fontSize:13, fontWeight:'700', color:C.text2 },
  tabTextActive: { color:C.accent },

  joinBtn: { borderWidth:1, borderColor:C.border, borderRadius:10, paddingHorizontal:12, paddingVertical:6 },
  joinBtnText: { fontSize:12, fontWeight:'700', color:C.accent },
  pendingBadge: { backgroundColor:'#F59E0B22', borderRadius:8, paddingHorizontal:10, paddingVertical:5 },
  pendingText: { fontSize:11, color:'#F59E0B', fontWeight:'700' },

  sectionLabel: { fontSize:11, fontWeight:'700', color:C.text2, marginBottom:10, textTransform:'uppercase', letterSpacing:0.6 },
  divider: { height:1, backgroundColor:C.border, marginVertical:14 },

  formBox: { backgroundColor:C.surface, borderRadius:14, borderWidth:1, borderColor:C.border, padding:14, marginBottom:12 },
  input: { backgroundColor:C.surfaceAlt, borderWidth:1, borderColor:C.border, borderRadius:10, paddingHorizontal:12, paddingVertical:11, color:C.text, fontSize:13 },
  addRowBtn: { backgroundColor:C.accent+'18', borderWidth:1, borderColor:C.border, borderRadius:10, paddingVertical:11, alignItems:'center', marginBottom:12 },
  addRowBtnText: { fontSize:13, fontWeight:'700', color:C.accent },
  cancelBtn: { flex:1, paddingVertical:10, backgroundColor:C.surfaceAlt, borderRadius:10, alignItems:'center' },
  cancelBtnText: { color:C.text2, fontSize:13, fontWeight:'700' },
  saveBtn: { flex:2, paddingVertical:10, backgroundColor:C.accent, borderRadius:10, alignItems:'center' },
  saveBtnText: { color:'#fff', fontSize:13, fontWeight:'700' },

  annCard: { backgroundColor:C.surface, borderRadius:12, borderWidth:1, borderColor:C.border, padding:14, marginBottom:10 },
  annTitle: { fontSize:14, fontWeight:'800', color:C.text, flex:1 },
  annDate: { fontSize:10, color:C.text2, marginTop:3, marginBottom:6 },
  annBody: { fontSize:13, color:C.text2, lineHeight:20 },

  calBox: { backgroundColor:C.surface, margin:12, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14 },
  calNav: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  calNavBtn: { backgroundColor:C.surfaceAlt, borderRadius:8, paddingHorizontal:14, paddingVertical:6 },
  calNavBtnText: { fontSize:18, fontWeight:'700', color:C.text2 },
  calNavTitle: { fontSize:15, fontWeight:'800', color:C.text },
  calDayRow: { flexDirection:'row', marginBottom:6 },
  calDayLabel: { flex:1, textAlign:'center', fontSize:11, fontWeight:'700', paddingVertical:3 },
  calGrid: { flexDirection:'row', flexWrap:'wrap' },
  calCell: { width:'14.28%', alignItems:'center', paddingVertical:5, borderRadius:8 },
  calCellSel: { backgroundColor:C.accent },
  calCellToday: { backgroundColor:C.surfaceHigh },
  calCellText: { fontSize:13, color:C.text, fontWeight:'500' },
  calDot: { width:4, height:4, borderRadius:2, backgroundColor:C.accent },

  trainingCard: { backgroundColor:C.surface, borderRadius:12, borderWidth:1, borderColor:C.border, borderLeftWidth:3, borderLeftColor:C.accent, padding:14, marginBottom:10 },
  trainingTitle: { fontSize:14, fontWeight:'800', color:C.text, flex:1 },
  trainingSub: { fontSize:12, color:C.text2, marginTop:3 },
  participantBox: { marginTop:10, borderTopWidth:1, borderTopColor:C.border, paddingTop:10, gap:6 },
  participantRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:4 },
  statusPill: { borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
  statusPillText: { fontSize:10, fontWeight:'700' },

  memberRow: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border },
  memberNick: { fontSize:13, fontWeight:'700', color:C.text },
  memberSub: { fontSize:11, color:C.text2, marginTop:1 },
  badge: { backgroundColor:C.surfaceAlt, borderRadius:4, paddingHorizontal:6, paddingVertical:1 },
  badgeText: { fontSize:9, fontWeight:'700', color:C.text2 },
  smBtn: { borderRadius:8, paddingHorizontal:10, paddingVertical:5 },
  smBtnText: { fontSize:11, fontWeight:'700', color:C.text2 },
})
