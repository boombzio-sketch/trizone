import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput, Linking,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const CATEGORIES = [
  { key: 'triathlon', label: '철인3종', icon: '🏅', color: '#0EA5E9' },
  { key: 'swim',      label: '수영',    icon: '🏊', color: '#06B6D4' },
  { key: 'bike',      label: '자전거',  icon: '🚴', color: '#F59E0B' },
  { key: 'run',       label: '달리기',  icon: '🏃', color: '#EF4444' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const DISTANCES_BY_CAT = {
  triathlon: [
    { key: 'sprint',  label: 'Sprint',  sub: '750m / 20km / 5km',        color: '#22C55E' },
    { key: 'olympic', label: 'Olympic', sub: '1.5km / 40km / 10km',      color: '#0EA5E9' },
    { key: 'half',    label: 'Half',    sub: '1.9km / 90.1km / 21.1km',  color: '#F97316' },
    { key: 'king',    label: 'King',    sub: '3.8km / 180.2km / 42.2km', color: '#EF4444' },
  ],
  swim: [
    { key: 'swim_750',  label: '750m',  sub: '오픈워터 750m',  color: '#22D3EE' },
    { key: 'swim_1500', label: '1.5km', sub: '오픈워터 1.5km', color: '#06B6D4' },
    { key: 'swim_3000', label: '3km',   sub: '오픈워터 3km',   color: '#0EA5E9' },
    { key: 'swim_5000', label: '5km',   sub: '오픈워터 5km',   color: '#6366F1' },
  ],
  bike: [
    { key: 'bike_50',   label: '50km',   sub: '단축 코스',        color: '#FACC15' },
    { key: 'bike_100',  label: '메디오',  sub: '메디오폰도 100km', color: '#F59E0B' },
    { key: 'bike_gran', label: '그란폰도', sub: '그란폰도 200km',   color: '#F97316' },
    { key: 'bike_200',  label: '200km+', sub: '울트라 장거리',     color: '#EA580C' },
  ],
  run: [
    { key: 'run_5k',   label: '5km',   sub: '5km',      color: '#34D399' },
    { key: 'run_10k',  label: '10km',  sub: '10km',     color: '#22C55E' },
    { key: 'run_half', label: '하프',  sub: '21.1km',   color: '#F97316' },
    { key: 'run_full', label: '풀코스', sub: '42.195km', color: '#EF4444' },
  ],
}
const DIST_MAP = Object.fromEntries(Object.values(DISTANCES_BY_CAT).flat().map(d => [d.key, d]))
const DISTANCES = DISTANCES_BY_CAT.triathlon  // 등록 폼(종목 선택)용 — 기존 동작 유지
const ETC_COLOR = '#94A3B8'

// distance는 이제 JSON 배열 문자열(복수 종목 + 기타). 과거 단일 문자열도 호환 파싱.
function parseDistances(distance) {
  if (Array.isArray(distance)) return distance
  if (distance == null || distance === '') return []
  try {
    const v = JSON.parse(distance)
    if (Array.isArray(v)) return v.map(String)
    return [String(v)]
  } catch {
    return [String(distance)]
  }
}

const EMPTY = { name: '', date: '', location: '', distance: 'olympic', entry_fee: '', reg_url: '', capacity: '', reg_start: '', reg_end: '' }

export default function RaceScreen() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setRaces(await api.getRaces()) }
    catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  function openNew() { setEditingId(null); setForm(EMPTY); setError(''); setShowForm(true) }
  function openEdit(r) { setEditingId(r.id); setForm({ name: r.name, date: r.date, location: r.location, distance: r.distance, entry_fee: String(r.entry_fee || ''), reg_url: r.reg_url || '', capacity: String(r.capacity || ''), reg_start: r.reg_start || '', reg_end: r.reg_end || '' }); setError(''); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingId(null); setForm(EMPTY); setError('') }

  async function handleSave() {
    if (!form.name.trim() || !form.date || !form.location.trim()) {
      setError('대회명, 날짜, 장소는 필수입니다.'); return
    }
    setSaving(true); setError('')
    try {
      const body = { ...form, entry_fee: parseInt(form.entry_fee) || 0, capacity: parseInt(form.capacity) || 0 }
      if (editingId) {
        const updated = await api.updateRace(editingId, body)
        setRaces(prev => prev.map(r => r.id === editingId ? updated : r).sort((a, b) => a.date.localeCompare(b.date)))
      } else {
        const race = await api.addRace(body)
        setRaces(prev => [...prev, race].sort((a, b) => a.date.localeCompare(b.date)))
      }
      closeForm()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    Alert.alert('삭제', '이 대회를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await api.deleteRace(id)
          setRaces(prev => prev.filter(r => r.id !== id))
          if (editingId === id) closeForm()
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = races.filter(r => r.date >= today)
  const past     = races.filter(r => r.date < today)

  return (
    <View style={s.root}>
      {/* 서브헤더 */}
      <View style={s.subHeader}>
        <View>
          <Text style={s.subTitle}>🏁 대회 일정</Text>
          <Text style={s.subSub}>예정 {upcoming.length}개 · 종료 {past.length}개</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* 뷰 토글 */}
          <View style={s.viewToggle}>
            <TouchableOpacity onPress={() => setViewMode('list')}
              style={[s.viewToggleBtn, viewMode === 'list' && s.viewToggleBtnActive]}>
              <Text style={[s.viewToggleText, viewMode === 'list' && s.viewToggleTextActive]}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('calendar')}
              style={[s.viewToggleBtn, viewMode === 'calendar' && s.viewToggleBtnActive]}>
              <Text style={[s.viewToggleText, viewMode === 'calendar' && s.viewToggleTextActive]}>📅</Text>
            </TouchableOpacity>
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={showForm ? closeForm : openNew}
              style={[s.addBtn, showForm && { backgroundColor: C.surfaceAlt }]}>
              <Text style={[s.addBtnText, showForm && { color: C.text2 }]}>{showForm ? '취소' : '+ 등록'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {viewMode === 'calendar' && !loading && (
        <RaceCalendar races={races} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {viewMode === 'list' && <FlatList
        data={[]}
        ListHeaderComponent={
          <>
            {/* 등록 폼 */}
            {showForm && (
              <View style={s.formBox}>
                <Text style={s.formTitle}>{editingId ? '대회 수정' : '새 대회 등록'}</Text>

                <Field label="대회명 *">
                  <TextInput style={s.input} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="예: 2026 부산 철인3종" placeholderTextColor={C.text2} />
                </Field>
                <View style={s.row2}>
                  <Field label="대회 날짜 *" style={{ flex: 1 }}>
                    <TextInput style={s.input} value={form.date} onChangeText={v => setForm(p => ({ ...p, date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={C.text2} />
                  </Field>
                  <Field label="장소 *" style={{ flex: 1 }}>
                    <TextInput style={s.input} value={form.location} onChangeText={v => setForm(p => ({ ...p, location: v }))} placeholder="예: 해운대" placeholderTextColor={C.text2} />
                  </Field>
                </View>

                <Field label="종목 *">
                  <View style={s.distGrid}>
                    {DISTANCES.map(d => (
                      <TouchableOpacity key={d.key} onPress={() => setForm(p => ({ ...p, distance: d.key }))}
                        style={[s.distBtn, form.distance === d.key && { backgroundColor: d.color + '20', borderColor: d.color }]}>
                        <Text style={[s.distLabel, form.distance === d.key && { color: d.color }]}>{d.label}</Text>
                        <Text style={s.distSub}>{d.sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                <View style={s.row2}>
                  <Field label="접수 시작일" style={{ flex: 1 }}>
                    <TextInput style={s.input} value={form.reg_start} onChangeText={v => setForm(p => ({ ...p, reg_start: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={C.text2} />
                  </Field>
                  <Field label="접수 마감일" style={{ flex: 1 }}>
                    <TextInput style={s.input} value={form.reg_end} onChangeText={v => setForm(p => ({ ...p, reg_end: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={C.text2} />
                  </Field>
                </View>
                <View style={s.row2}>
                  <Field label="참가비 (원)" style={{ flex: 1 }}>
                    <TextInput style={s.input} value={form.entry_fee} onChangeText={v => setForm(p => ({ ...p, entry_fee: v }))} placeholder="예: 80000" placeholderTextColor={C.text2} keyboardType="number-pad" />
                  </Field>
                  <Field label="모집 인원" style={{ flex: 1 }}>
                    <TextInput style={s.input} value={form.capacity} onChangeText={v => setForm(p => ({ ...p, capacity: v }))} placeholder="예: 300" placeholderTextColor={C.text2} keyboardType="number-pad" />
                  </Field>
                </View>
                <Field label="신청 링크">
                  <TextInput style={s.input} value={form.reg_url} onChangeText={v => setForm(p => ({ ...p, reg_url: v }))} placeholder="https://..." placeholderTextColor={C.text2} keyboardType="url" autoCapitalize="none" />
                </Field>

                {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

                <TouchableOpacity onPress={handleSave} disabled={saving}
                  style={[s.saveBtn, saving && { backgroundColor: C.surfaceHigh }]}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editingId ? '💾 수정 저장' : '💾 대회 등록'}</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* 목록 */}
            {loading
              ? <View style={{ padding: 48, alignItems: 'center' }}><ActivityIndicator color={C.accent} size="large" /></View>
              : races.length === 0
                ? <View style={{ padding: 56, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 12 }}>🏁</Text>
                    <Text style={{ color: C.text2, fontSize: 14 }}>등록된 대회가 없습니다</Text>
                  </View>
                : <>
                    {upcoming.length > 0 && <Text style={s.section}>예정 대회</Text>}
                    {upcoming.map(r => <RaceCard key={r.id} race={r} isAdmin={isAdmin} today={today} onEdit={openEdit} onDelete={handleDelete} />)}
                    {past.length > 0 && <Text style={[s.section, { marginTop: upcoming.length > 0 ? 16 : 0 }]}>종료된 대회</Text>}
                    {past.map(r => <RaceCard key={r.id} race={r} isAdmin={isAdmin} today={today} isPast onEdit={openEdit} onDelete={handleDelete} />)}
                  </>
            }
          </>
        }
        keyExtractor={() => 'dummy'}
        renderItem={null}
        contentContainerStyle={{ paddingBottom: 32 }}
      />}
    </View>
  )
}

function RaceCard({ race: r, isAdmin, today, isPast, onEdit, onDelete }) {
  const cat = CAT_MAP[r.category || 'triathlon'] || CAT_MAP.triathlon
  const dists = parseDistances(r.distance).map(k => DIST_MAP[k] || { label: k, color: ETC_COLOR, sub: '' })
  const accent = isPast ? C.text3 : cat.color
  const dDay = Math.ceil((new Date(r.date) - new Date(today)) / 86400000)

  return (
    <View style={[s.card, { borderLeftColor: accent }, isPast && { opacity: 0.55 }]}>
      <View style={s.cardBody}>
        {/* 배지 행: 카테고리 + 종목(복수) / 우측 D-Day — 웹과 동일하게 윗줄에 배지 */}
        <View style={s.badgeRow}>
          <View style={s.badgeWrap}>
            <View style={[s.catBadge, { backgroundColor: cat.color + '18' }]}>
              <Text style={[s.catBadgeText, { color: cat.color }]}>{cat.icon} {cat.label}</Text>
            </View>
            {dists.map((d, i) => (
              <View key={i} style={[s.distBadge, { backgroundColor: d.color + '20', borderColor: d.color + '60' }]}>
                <Text style={[s.distBadgeText, { color: d.color }]}>{d.label}</Text>
              </View>
            ))}
          </View>
          {!isPast && (
            <Text style={[s.dDay, { color: dDay <= 30 ? '#EF4444' : C.text2 }]}>
              {dDay === 0 ? 'D-Day' : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
            </Text>
          )}
        </View>

        {/* 대회명 — 배지 다음 줄, 전체 너비 */}
        <Text style={s.cardName}>{r.name}</Text>
        <Text style={s.cardMeta}>📅 {r.date}</Text>
        <Text style={s.cardMeta}>📍 {r.location}</Text>

        {/* 단일 종목이면 상세 거리 표시 */}
        {dists.length === 1 && dists[0].sub ? <Text style={s.distInfo}>{dists[0].sub}</Text> : null}

        {/* 하단 정보 - 2열 그리드 */}
        {(r.entry_fee > 0 || r.capacity > 0 || r.reg_start) && (
          <View style={s.infoGrid}>
            {r.entry_fee > 0 && (
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>참가비</Text>
                <Text style={s.infoValue}>💰 {r.entry_fee.toLocaleString()}원</Text>
              </View>
            )}
            {r.capacity > 0 && (
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>모집 인원</Text>
                <Text style={s.infoValue}>👥 {r.capacity}명</Text>
              </View>
            )}
            {r.reg_start && (
              <View style={[s.infoCell, { width: '100%' }]}>
                <Text style={s.infoLabel}>접수 기간</Text>
                <Text style={s.infoValue}>📋 {r.reg_start} ~ {r.reg_end}</Text>
              </View>
            )}
          </View>
        )}

        {/* 버튼 */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' }}>
          {r.reg_url ? (
            <TouchableOpacity onPress={() => Linking.openURL(r.reg_url)}
              style={[s.regBtn, { flex: 1, backgroundColor: accent + '20', borderWidth: 1, borderColor: accent + '60', alignItems: 'center' }]}>
              <Text style={[s.regBtnText, { color: accent }]}>신청하기</Text>
            </TouchableOpacity>
          ) : null}
          {isAdmin && (
            <>
              <TouchableOpacity onPress={() => onEdit(r)} style={s.adminBtn}>
                <Text style={s.adminBtnText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(r.id)} style={[s.adminBtn, { backgroundColor: C.errorBg }]}>
                <Text style={[s.adminBtnText, { color: C.error }]}>삭제</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  )
}

/* ─── 달력 뷰 ─── */
function RaceCalendar({ races, isAdmin, onEdit, onDelete }) {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(null)

  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAYS   = ['일','월','화','수','목','금','토']
  const today  = now.toISOString().slice(0, 10)

  const monthStr    = `${year}-${String(month+1).padStart(2,'0')}`
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells       = Array(Math.ceil((firstDow + daysInMonth) / 7) * 7).fill(null)
  for (let i = 0; i < daysInMonth; i++) cells[firstDow + i] = i + 1

  const byDay = {}
  races.forEach(r => {
    if (r.date.startsWith(monthStr)) {
      const day = parseInt(r.date.slice(8, 10))
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(r)
    }
  })

  const selRaces = selected ? (byDay[selected] || []) : []
  const selDate  = selected ? `${monthStr}-${String(selected).padStart(2,'0')}` : null

  function prev() { if (month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1); setSelected(null) }
  function next() { if (month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1); setSelected(null) }

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      {/* 월 네비 */}
      <View style={cal.nav}>
        <TouchableOpacity onPress={prev} style={cal.navBtn}><Text style={cal.navBtnText}>‹</Text></TouchableOpacity>
        <Text style={cal.navTitle}>{year}년 {MONTHS[month]}</Text>
        <TouchableOpacity onPress={next} style={cal.navBtn}><Text style={cal.navBtnText}>›</Text></TouchableOpacity>
      </View>

      {/* 요일 */}
      <View style={cal.dayRow}>
        {DAYS.map((d,i) => (
          <Text key={d} style={[cal.dayLabel, { color: i===0?'#EF4444':i===6?C.accent:C.text2 }]}>{d}</Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={cal.cell} />
          const dateStr  = `${monthStr}-${String(day).padStart(2,'0')}`
          const dayRaces = byDay[day] || []
          const isToday  = dateStr === today
          const isSel    = selected === day
          const dow      = i % 7
          return (
            <TouchableOpacity key={i} onPress={() => dayRaces.length && setSelected(isSel ? null : day)}
              style={[cal.cell, isSel && cal.cellSel, isToday && !isSel && cal.cellToday]}>
              <Text style={[cal.cellNum,
                isSel && { color:'#fff', fontWeight:'800' },
                !isSel && isToday && { color:C.accent, fontWeight:'800' },
                !isSel && !isToday && dow===0 && { color:'#EF4444' },
                !isSel && !isToday && dow===6 && { color:C.accent },
              ]}>{day}</Text>
              {dayRaces.slice(0,2).map(r => {
                const first = parseDistances(r.distance)[0]
                const dm = DIST_MAP[first]
                const dc = dm?.color || CAT_MAP[r.category]?.color || C.accent
                return (
                  <View key={r.id} style={[cal.raceDot, { backgroundColor: dc+'30' }]}>
                    <Text style={[cal.raceDotText, { color: dc }]} numberOfLines={1}>
                      {dm?.label || first || ''}
                    </Text>
                  </View>
                )
              })}
              {dayRaces.length > 2 && <Text style={cal.moreText}>+{dayRaces.length-2}</Text>}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* 선택 날 대회 */}
      {selDate && selRaces.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={cal.selLabel}>{selDate} 대회</Text>
          {selRaces.map(r => (
            <RaceCard key={r.id} race={r} isAdmin={isAdmin} today={today}
              isPast={r.date < today} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const cal = StyleSheet.create({
  nav:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  navBtn:      { backgroundColor:C.surfaceAlt, borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  navBtnText:  { fontSize:18, fontWeight:'700', color:C.text2 },
  navTitle:    { fontSize:16, fontWeight:'800', color:C.text },
  dayRow:      { flexDirection:'row', marginBottom:4 },
  dayLabel:    { flex:1, textAlign:'center', fontSize:11, fontWeight:'700', paddingVertical:4 },
  grid:        { flexDirection:'row', flexWrap:'wrap' },
  cell:        { width:'14.28%', minHeight:56, alignItems:'center', paddingVertical:4, paddingHorizontal:1, borderRadius:8 },
  cellSel:     { backgroundColor:C.accent },
  cellToday:   { backgroundColor:C.surfaceHigh },
  cellNum:     { fontSize:12, color:C.text, fontWeight:'500', marginBottom:2 },
  raceDot:     { width:'90%', borderRadius:3, paddingHorizontal:2, paddingVertical:1, marginBottom:1 },
  raceDotText: { fontSize:8, fontWeight:'700', textAlign:'center' },
  moreText:    { fontSize:8, color:C.text2 },
  selLabel:    { fontSize:11, fontWeight:'700', color:C.text2, textTransform:'uppercase', letterSpacing:0.6, marginBottom:8 },
})

function Field({ label, children, style }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 12 },
  viewToggle: { flexDirection:'row', backgroundColor:C.surfaceAlt, borderRadius:10, padding:3, borderWidth:1, borderColor:C.border },
  viewToggleBtn: { paddingHorizontal:10, paddingVertical:5, borderRadius:7 },
  viewToggleBtnActive: { backgroundColor:C.surfaceHigh },
  viewToggleText: { fontSize:16, color:C.text2 },
  viewToggleTextActive: { color:C.text },
  subTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  subSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  addBtn: { backgroundColor: C.accent, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  formBox: { margin: 12, backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  formTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 16 },
  row2: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: C.text, fontSize: 13 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  distGrid: { flexDirection: 'row', gap: 6 },
  distBtn: { flex: 1, padding: 8, backgroundColor: C.surfaceAlt, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', alignItems: 'center' },
  distLabel: { fontSize: 11, fontWeight: '700', color: C.text2 },
  distSub: { fontSize: 8, color: C.text2, marginTop: 2, textAlign: 'center' },
  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 10, padding: 10, marginBottom: 10 },
  errorText: { color: C.error, fontSize: 13 },
  saveBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  section: { fontSize: 11, fontWeight: '700', color: C.text2, paddingHorizontal: 12, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.6 },

  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, borderLeftWidth: 4 },
  cardBody: { paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  badgeWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  catBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  cardName: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4 },
  cardMeta: { fontSize: 14, color: C.text2, marginTop: 2 },
  distBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  distBadgeText: { fontSize: 13, fontWeight: '700' },
  dDay: { fontSize: 14, fontWeight: '800' },
  distInfo: { fontSize: 13, color: C.text2, marginTop: 6, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardInfo: { fontSize: 13, color: C.text2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10 },
  infoCell: { width: '47%' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.text },
  regBtn: { backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  regBtnText: { fontSize: 14, fontWeight: '700', color: C.text2 },
  adminBtn: { backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  adminBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },
})
