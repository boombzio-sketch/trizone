import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../utils/api'
import { C } from '../utils/theme'
import { SPORT_LABEL, SPORT_COLOR, SPORT_ICON, formatDuration, parseDuration } from '../utils/helpers'

const SPORTS = ['swim', 'bike', 'run', 'brick']
const VIS_OPTIONS = [
  { key: 'public',    label: '전체',   icon: '🌍', color: '#10B981' },
  { key: 'club',      label: '클럽원', icon: '👥', color: C.accent },
  { key: 'followers', label: '팔로워', icon: '👤', color: '#C084FC' },
  { key: 'private',   label: '비공개', icon: '🔒', color: C.text2 },
]

function today() { return new Date().toISOString().slice(0, 10) }

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState('cal')
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    setLogsLoading(true)
    try {
      const rows = await api.getWorkouts('limit=200')
      setLogs(rows)
    } catch {}
    finally { setLogsLoading(false) }
  }

  async function handleDelete(id) {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try { await api.deleteWorkout(id); loadLogs() }
        catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  return (
    <View style={s.root}>
      {/* 탭 헤더 */}
      <View style={s.tabHeader}>
        {[['cal','📅 달력'],['add','➕ 추가']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => { setTab(k); if (k !== 'add') loadLogs() }} style={[s.headerTab, tab === k && s.headerTabActive]}>
            <Text style={[s.headerTabText, tab === k && s.headerTabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'cal' && <CalendarTab logs={logs} />}

      {tab === 'add' && (
        <AddForm onSaved={() => { loadLogs(); setTab('cal') }} />
      )}
    </View>
  )
}

/* ─── 목록 아이템 ─── */
function LogItem({ log, onDelete }) {
  const sc = SPORT_COLOR[log.sport_type] || C.accent
  const segs = log.sport_type === 'brick'
    ? (() => { try { return JSON.parse(log.brick_segments || '[]') } catch { return [] } })()
    : null

  return (
    <View style={[s.logCard, { borderLeftColor: sc }]}>
      <View style={s.logRow}>
        <View style={[s.logIcon, { backgroundColor: sc + '18' }]}>
          <Text style={{ fontSize: 20 }}>{SPORT_ICON[log.sport_type]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Text style={[s.logSport, { color: sc }]}>{SPORT_LABEL[log.sport_type]}</Text>
            {log.points_earned > 0 && (
              <View style={s.logPointsBadge}>
                <Text style={s.logPointsText}>+{log.points_earned}p</Text>
              </View>
            )}
            <Text style={s.logDate}>{log.logged_at}</Text>
          </View>
          {segs
            ? <Text style={s.logSub}>{segs.map(s => `${SPORT_ICON[s.sport]}${s.distance_km}km`).join('  ')}</Text>
            : <Text style={s.logSub}>{log.distance_km}km · {formatDuration(log.duration_sec)}</Text>
          }
          {log.memo ? <Text style={s.logMemo}>{log.memo}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onDelete(log.id)} style={{ padding: 4 }}>
          <Text style={{ fontSize: 16 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ─── 달력 탭 ─── */
function CalendarTab({ logs }) {
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(null)

  const byDate = {}
  logs.forEach(l => {
    const d = l.logged_at?.slice(0, 10)
    if (!d) return
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(l)
  })

  const firstDay = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)
  const cells = Array(Math.ceil((firstDay + daysInMonth) / 7) * 7).fill(null)
  for (let i = 0; i < daysInMonth; i++) cells[firstDay + i] = i + 1

  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAYS   = ['일','월','화','수','목','금','토']

  const selDate = selected ? `${cur.y}-${String(cur.m+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}` : null
  const selLogs = selDate ? (byDate[selDate] || []) : []

  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      {/* 월 네비 */}
      <View style={s.calNav}>
        <TouchableOpacity onPress={() => { setCur(p => { const d = new Date(p.y, p.m-1); return { y: d.getFullYear(), m: d.getMonth() } }); setSelected(null) }} style={s.calNavBtn}>
          <Text style={s.calNavBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.calTitle}>{cur.y}년 {MONTHS[cur.m]}</Text>
        <TouchableOpacity onPress={() => { setCur(p => { const d = new Date(p.y, p.m+1); return { y: d.getFullYear(), m: d.getMonth() } }); setSelected(null) }} style={s.calNavBtn}>
          <Text style={s.calNavBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={s.calDayRow}>
        {DAYS.map((d, i) => (
          <Text key={d} style={[s.calDayLabel, { color: i === 0 ? '#EF4444' : i === 6 ? C.accent : C.text2 }]}>{d}</Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={s.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={s.calCell} />
          const dateStr = `${cur.y}-${String(cur.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const dayLogs = byDate[dateStr] || []
          const isToday = dateStr === todayStr
          const isSel = selected === day
          const dow = i % 7
          return (
            <TouchableOpacity key={i} onPress={() => setSelected(isSel ? null : day)} style={[
              s.calCell,
              isSel && { backgroundColor: C.accent + '22', borderRadius: 10 },
              isToday && !isSel && { backgroundColor: C.surfaceHigh, borderRadius: 10 },
            ]}>
              <Text style={[s.calDayNum, { color: isSel ? C.accent : dow === 0 ? '#EF4444' : dow === 6 ? C.accent : C.text, fontWeight: isToday ? '900' : '500' }]}>{day}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 14 }}>
                {dayLogs.slice(0, 3).map((l, j) => (
                  <Text key={j} style={{ fontSize: 10 }}>{SPORT_ICON[l.sport_type]}</Text>
                ))}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* 선택 날짜 기록 */}
      {selDate && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.selDateLabel}>{selDate} 기록</Text>
          {selLogs.length === 0
            ? <Text style={s.emptyText}>훈련 기록이 없습니다</Text>
            : selLogs.map(l => (
              <View key={l.id} style={[s.selLog, { borderLeftColor: SPORT_COLOR[l.sport_type] }]}>
                <Text style={{ fontSize: 18 }}>{SPORT_ICON[l.sport_type]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.logSport, { color: SPORT_COLOR[l.sport_type] }]}>{SPORT_LABEL[l.sport_type]}</Text>
                  <Text style={s.logSub}>{(l.distance_km||0).toFixed(2)}km · {formatDuration(l.duration_sec)}</Text>
                </View>
                {l.points_earned > 0 && (
                  <View style={s.logPointsBadge}>
                    <Text style={s.logPointsText}>+{l.points_earned}p</Text>
                  </View>
                )}
              </View>
            ))
          }
        </View>
      )}
    </ScrollView>
  )
}

/* ─── 추가 폼 ─── */
function AddForm({ onSaved }) {
  const [sport, setSport] = useState('swim')
  const [date, setDate]   = useState(today())
  const [dist, setDist]   = useState('')
  const [time, setTime]   = useState('')
  const [memo, setMemo]   = useState('')
  const [poolType, setPoolType]     = useState('open')
  const [courseType, setCourseType] = useState('실외')
  const [elevation, setElevation]   = useState('')
  const [power, setPower]           = useState('')
  const [visibility, setVisibility] = useState('public')
  const [brick, setBrick] = useState([
    { sport: 'swim', distance: '', time: '' },
    { sport: 'bike', distance: '', time: '' },
    { sport: 'run',  distance: '', time: '' },
  ])
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const sc = SPORT_COLOR[sport]

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      const dur  = parseDuration(time)
      const dist_ = parseFloat(dist) || 0
      let body = { sport_type: sport, logged_at: date, distance_km: dist_, duration_sec: dur, memo, visibility }
      if (sport === 'swim') body.pool_type = poolType
      else if (sport === 'bike') { body.course_type = courseType; body.elevation_m = parseInt(elevation)||0; body.avg_power_w = parseInt(power)||0 }
      else if (sport === 'run') body.course_type = courseType
      else if (sport === 'brick') {
        const segs = brick.map(b => ({ sport: b.sport, distance_km: parseFloat(b.distance)||0, duration_sec: parseDuration(b.time) }))
        body.brick_segments = segs
        body.distance_km = segs.reduce((s, b) => s + b.distance_km, 0)
        body.duration_sec = segs.reduce((s, b) => s + b.duration_sec, 0) + parseDuration(t1) + parseDuration(t2)
      }
      const saved = await api.addWorkout(body)
      const pts = saved?.points_earned || 0
      Alert.alert('저장 완료', pts > 0 ? `기록이 저장되었습니다!\n💎 +${pts}p 적립!` : '기록이 저장되었습니다!', [
        { text: '확인', onPress: onSaved }
      ])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {/* 종목 선택 */}
      <View style={s.sportGrid}>
        {SPORTS.map(sp => (
          <TouchableOpacity key={sp} onPress={() => setSport(sp)} style={[
            s.sportBtn,
            sport === sp && { backgroundColor: SPORT_COLOR[sp] + '18', borderColor: SPORT_COLOR[sp] },
          ]}>
            <Text style={{ fontSize: 22 }}>{SPORT_ICON[sp]}</Text>
            <Text style={[s.sportBtnLabel, sport === sp && { color: SPORT_COLOR[sp] }]}>{SPORT_LABEL[sp]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 날짜 */}
      <Field label="📅 날짜">
        <TextInput style={[s.input, { borderColor: sc + '44' }]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.text2} />
      </Field>

      {sport !== 'brick' ? (
        <>
          <Field label="📏 거리 (km)">
            <TextInput style={[s.input, { borderColor: sc + '44' }]} value={dist} onChangeText={setDist} placeholder="예: 1.5" placeholderTextColor={C.text2} keyboardType="decimal-pad" />
          </Field>
          <Field label="⏱️ 시간 (HH:MM:SS)">
            <TextInput style={[s.input, { borderColor: sc + '44' }]} value={time} onChangeText={setTime} placeholder="예: 1:02:18" placeholderTextColor={C.text2} />
          </Field>
          {sport === 'swim' && (
            <Field label="🌊 수영 환경">
              <Chips options={[['open','오픈워터'],['pool25','25m'],['pool50','50m']]} value={poolType} onChange={setPoolType} color={sc} />
            </Field>
          )}
          {sport === 'bike' && (
            <>
              <Field label="📈 누적 고도 (m)">
                <TextInput style={[s.input, { borderColor: sc + '44' }]} value={elevation} onChangeText={setElevation} placeholder="예: 850" placeholderTextColor={C.text2} keyboardType="number-pad" />
              </Field>
              <Field label="⚡ 평균 파워 (W)">
                <TextInput style={[s.input, { borderColor: sc + '44' }]} value={power} onChangeText={setPower} placeholder="예: 210" placeholderTextColor={C.text2} keyboardType="number-pad" />
              </Field>
              <Field label="🛣️ 코스 유형">
                <Chips options={[['실외','실외'],['실내','실내']]} value={courseType} onChange={setCourseType} color={sc} />
              </Field>
            </>
          )}
          {sport === 'run' && (
            <Field label="🛣️ 코스 유형">
              <Chips options={[['실외','실외'],['실내','실내']]} value={courseType} onChange={setCourseType} color={sc} />
            </Field>
          )}
        </>
      ) : (
        [{ sport: 'swim', label: '수영', idx: 0 }, { sport: 'bike', label: '사이클', idx: 1 }, { sport: 'run', label: '런', idx: 2 }].map(({ sport: sp, label, idx }) => (
          <View key={sp}>
            <View style={[s.brickSeg, { borderLeftColor: SPORT_COLOR[sp] }]}>
              <Text style={[s.brickSegLabel, { color: SPORT_COLOR[sp] }]}>{SPORT_ICON[sp]} {label}</Text>
              <View style={s.brickRow}>
                <TextInput style={[s.input, { flex: 1, borderColor: SPORT_COLOR[sp] + '44' }]} value={brick[idx].distance}
                  onChangeText={v => { const b=[...brick]; b[idx]={...b[idx],distance:v}; setBrick(b) }}
                  placeholder="거리 km" placeholderTextColor={C.text2} keyboardType="decimal-pad" />
                <TextInput style={[s.input, { flex: 1, borderColor: SPORT_COLOR[sp] + '44' }]} value={brick[idx].time}
                  onChangeText={v => { const b=[...brick]; b[idx]={...b[idx],time:v}; setBrick(b) }}
                  placeholder="HH:MM:SS" placeholderTextColor={C.text2} />
              </View>
            </View>
            {idx < 2 && (
              <View style={s.transition}>
                <View style={s.transLine} />
                <Text style={s.transLabel}>T{idx+1} 전환</Text>
                <TextInput style={[s.input, { width: 90, borderColor: '#F59E0B44' }]}
                  value={idx === 0 ? t1 : t2}
                  onChangeText={idx === 0 ? setT1 : setT2}
                  placeholder="HH:MM:SS" placeholderTextColor={C.text2} />
                <View style={s.transLine} />
              </View>
            )}
          </View>
        ))
      )}

      {/* 메모 */}
      <Field label="📝 메모 (선택)">
        <TextInput style={[s.input, s.textarea, { borderColor: sc + '44' }]}
          value={memo} onChangeText={setMemo}
          placeholder="오늘 훈련 소감을 적어보세요" placeholderTextColor={C.text2}
          multiline numberOfLines={3} textAlignVertical="top" />
      </Field>

      {/* 공개 범위 */}
      <Field label="🔒 공개 범위">
        <View style={s.visGrid}>
          {VIS_OPTIONS.map(v => {
            const active = visibility === v.key
            return (
              <TouchableOpacity key={v.key} onPress={() => setVisibility(v.key)}
                style={[s.visBtn, active && { backgroundColor: v.color + '20', borderColor: v.color }]}>
                <Text style={{ fontSize: 18 }}>{v.icon}</Text>
                <Text style={[s.visBtnLabel, active && { color: v.color }]}>{v.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Field>

      {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

      <TouchableOpacity onPress={handleSubmit} disabled={loading}
        style={[s.submitBtn, { backgroundColor: loading ? C.surfaceHigh : sc }]}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.submitText}>💾 {SPORT_LABEL[sport]} 기록 저장</Text>
        }
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

function Chips({ options, value, onChange, color }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map(([v, l]) => (
        <TouchableOpacity key={v} onPress={() => onChange(v)}
          style={[s.chip, value === v && { backgroundColor: color + '18', borderColor: color }]}>
          <Text style={[s.chipText, value === v && { color }]}>{l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  tabHeader: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  headerTabActive: { borderBottomColor: C.accent },
  headerTabText: { fontSize: 13, fontWeight: '700', color: C.text2 },
  headerTabTextActive: { color: C.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 24 },

  logCard: { backgroundColor: C.surface, borderRadius: 14, marginBottom: 8, borderLeftWidth: 4, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  logIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logSport: { fontSize: 13, fontWeight: '700' },
  logPointsBadge: { backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  logPointsText: { fontSize: 9, fontWeight: '800', color: C.gold },
  logDate: { fontSize: 11, color: C.text2 },
  logSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  logMemo: { fontSize: 11, color: C.text2, marginTop: 3, fontStyle: 'italic' },

  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavBtn: { backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  calNavBtnText: { fontSize: 18, fontWeight: '700', color: C.text2 },
  calTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  calDayRow: { flexDirection: 'row', marginBottom: 6 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  calDayNum: { fontSize: 12 },
  selDateLabel: { fontSize: 12, fontWeight: '700', color: C.text2, marginBottom: 10 },
  selLog: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderLeftWidth: 3 },

  sportGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sportBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.surfaceAlt, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', gap: 4 },
  sportBtnLabel: { fontSize: 12, fontWeight: '700', color: C.text2 },
  input: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: C.text, fontSize: 14 },
  textarea: { minHeight: 72, paddingTop: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.text2, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.6 },
  chip: { flex: 1, paddingVertical: 9, backgroundColor: C.surfaceAlt, borderRadius: 100, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  chipText: { fontSize: 12, fontWeight: '700', color: C.text2 },
  brickSeg: { backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 6, borderLeftWidth: 3 },
  brickSegLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
  brickRow: { flexDirection: 'row', gap: 8 },
  transition: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4, paddingHorizontal: 4 },
  transLine: { flex: 1, height: 1, backgroundColor: C.border },
  transLabel: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  visGrid: { flexDirection: 'row', gap: 6 },
  visBtn: { flex: 1, paddingVertical: 10, backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', gap: 3 },
  visBtnLabel: { fontSize: 11, fontWeight: '700', color: C.text2 },
  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: C.error, fontSize: 13 },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
