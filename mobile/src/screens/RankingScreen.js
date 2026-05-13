import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { C } from '../utils/theme'
import { SPORT_ICON } from '../utils/helpers'
import Avatar from '../components/Avatar'

const PERIODS = [{ key: 'weekly', label: '주간' }, { key: 'monthly', label: '월간' }, { key: 'yearly', label: '연간' }, { key: 'custom', label: '기간설정' }]
const SPORTS  = [{ key: 'swim', label: '🏊 수영' }, { key: 'bike', label: '🚴 사이클' }, { key: 'run', label: '🏃 런' }]
const SCOPES  = [{ key: 'following', label: '팔로잉' }, { key: 'club', label: '클럽' }, { key: 'all', label: '전체' }]

const PODIUM = [
  { bg: '#FBBF2415', border: '#FBBF2440', rankColor: '#FBBF24', label: '🥇' },
  { bg: '#CBD5E115', border: '#CBD5E140', rankColor: '#CBD5E1', label: '🥈' },
  { bg: '#FB923C15', border: '#FB923C40', rankColor: '#FB923C', label: '🥉' },
]

export default function RankingScreen() {
  const { user } = useAuth()

  const [scope, setScope]             = useState('club')
  const [period, setPeriod]           = useState('weekly')
  const [sport, setSport]             = useState('swim')
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [myClubs, setMyClubs]         = useState([])
  const [selectedClubId, setSelectedClubId] = useState(null)
  const today = new Date().toISOString().slice(0, 10)
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo]     = useState(today)
  const [picker, setPicker] = useState(null)

  useEffect(() => {
    api.getMyClubs().then(clubs => {
      setMyClubs(clubs)
      if (clubs.length === 1) setSelectedClubId(clubs[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => { if (scope !== 'club') setSelectedClubId(null) }, [scope])

  useEffect(() => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    const clubId = scope === 'club' ? selectedClubId : null
    const call = period === 'custom'
      ? api.getRankingCustom(customFrom, customTo, sport, scope, clubId)
      : api.getRanking(period, sport, scope, clubId)
    call.then(r => setData(r)).catch(() => {}).finally(() => setLoading(false))
  }, [period, sport, scope, customFrom, customTo, selectedClubId])

  const rankings = data?.rankings || []
  const myData = rankings.find(r => r.user_id === user?.id) || null
  const myRank = rankings.findIndex(r => r.user_id === user?.id) + 1
  const myKm = myData
    ? (sport === 'swim' ? myData.swim_km : sport === 'bike' ? myData.bike_km : sport === 'run' ? myData.run_km : myData.total_km) || 0
    : 0

  function mainValue(row) {
    if (sport === 'swim') return `${(row.swim_km||0).toFixed(1)}km`
    if (sport === 'bike') return `${(row.bike_km||0).toFixed(1)}km`
    if (sport === 'run')  return `${(row.run_km||0).toFixed(1)}km`
    return `${(row.total_km||0).toFixed(1)}km`
  }

  return (
    <View style={s.root}>
      <FlatList
        data={rankings}
        keyExtractor={r => String(r.user_id)}
        ListHeaderComponent={
          <>
            {/* 내 기록 패널 */}
            <View style={s.myPanel}>
              <Text style={s.myPanelTitle}>⚡ 나의 기록
                {data && <Text style={s.myPanelDate}>  {data.from} ~ {data.to}</Text>}
              </Text>
              <View style={s.myStats}>
                {[
                  { label: '수영', val: (myData?.swim_km||0).toFixed(2), color: C.swim },
                  { label: '사이클', val: (myData?.bike_km||0).toFixed(2), color: C.bike },
                  { label: '런', val: (myData?.run_km||0).toFixed(2), color: C.run },
                ].map(it => (
                  <View key={it.label} style={[s.myStatCard, { borderTopColor: it.color, borderColor: it.color + '30', backgroundColor: it.color + '10' }]}>
                    <Text style={[s.myStatLabel, { color: it.color }]}>{it.label}</Text>
                    <Text style={s.myStatVal}>{it.val}</Text>
                    <Text style={[s.myStatUnit, { color: it.color }]}>km</Text>
                  </View>
                ))}
              </View>
              <View style={s.myTotals}>
                <View style={s.myTotalCard}>
                  <Text style={s.myTotalLabel}>총 거리</Text>
                  <Text style={[s.myTotalVal, { color: C.accent }]}>{(myData?.total_km||0).toFixed(2)}<Text style={s.myTotalUnit}>km</Text></Text>
                </View>
                <View style={[s.myTotalCard, { backgroundColor: C.surfaceAlt }]}>
                  <Text style={s.myTotalLabel}>훈련 횟수</Text>
                  <Text style={s.myTotalVal}>{myData?.workout_count || 0}<Text style={s.myTotalUnit}>회</Text></Text>
                </View>
              </View>
            </View>

            {/* 범위 탭 */}
            <View style={s.scopeRow}>
              {SCOPES.map(sc => (
                <TouchableOpacity key={sc.key} onPress={() => setScope(sc.key)} style={[s.scopeTab, scope === sc.key && s.scopeTabActive]}>
                  <Text style={[s.scopeTabText, scope === sc.key && s.scopeTabTextActive]}>{sc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 클럽 선택 칩 (클럽 scope + 2개 이상) */}
            {scope === 'club' && myClubs.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection:'row', gap:6, paddingHorizontal:14, paddingVertical:7 }}>
                {[{ id: null, name: '전체' }, ...myClubs].map(c => {
                  const active = selectedClubId === c.id
                  return (
                    <TouchableOpacity key={c.id ?? 'all'} onPress={() => setSelectedClubId(c.id)}
                      style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:100,
                        backgroundColor: active ? C.accent : C.surfaceHigh,
                        borderWidth: active ? 0 : 1, borderColor: C.borderLight }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color: active ? '#fff' : C.text }}>{c.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}

            {/* 기간 필터 */}
            <View style={s.filterRow}>
              {PERIODS.map(p => (
                <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)} style={[s.filterChip, period === p.key && s.filterChipActive]}>
                  <Text style={[s.filterChipText, period === p.key && s.filterChipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {period === 'custom' ? (
              <View style={s.customDateRow}>
                <TouchableOpacity onPress={() => setPicker('from')} style={s.dateBtn}>
                  <Text style={s.dateBtnIcon}>📅</Text>
                  <Text style={s.dateBtnText}>{customFrom}</Text>
                </TouchableOpacity>
                <Text style={{ color: C.text2, fontWeight: '700' }}>~</Text>
                <TouchableOpacity onPress={() => setPicker('to')} style={s.dateBtn}>
                  <Text style={s.dateBtnIcon}>📅</Text>
                  <Text style={s.dateBtnText}>{customTo}</Text>
                </TouchableOpacity>
              </View>
            ) : data?.from && data?.to ? (
              <Text style={s.periodDate}>{data.from} ~ {data.to}</Text>
            ) : null}

            {/* 종목 필터 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sportRow}>
              {SPORTS.map(sp => (
                <TouchableOpacity key={sp.key} onPress={() => setSport(sp.key)} style={[s.sportChip, sport === sp.key && s.sportChipActive]}>
                  <Text style={[s.sportChipText, sport === sp.key && s.sportChipTextActive]}>{sp.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 내 순위 배너 */}
            {myRank > 0 && myData && myKm > 0 && (
              <View style={s.myRankBanner}>
                <View>
                  <Text style={s.myRankLabel}>내 순위</Text>
                  <Text style={s.myRankNum}>{myRank}<Text style={s.myRankSuffix}>위</Text></Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.myRankDistLabel}>{SPORT_ICON[sport]} 거리</Text>
                  <Text style={s.myRankDist}>{mainValue(myData)}</Text>
                </View>
              </View>
            )}

            {loading && <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>}
            {!loading && rankings.length === 0 && (
              <View style={s.center}><Text style={s.emptyText}>아직 훈련 기록이 없습니다.{'\n'}첫 번째로 기록을 등록해보세요! 💪</Text></View>
            )}
          </>
        }
        renderItem={({ item: r, index: i }) => {
          const isMe = r.user_id === user?.id
          const podium = PODIUM[i]
          return (
            <View style={[
              s.rankRow,
              podium && { backgroundColor: podium.bg, borderLeftWidth: 3, borderLeftColor: podium.border },
              !podium && isMe && { backgroundColor: C.accent + '10', borderLeftWidth: 3, borderLeftColor: C.accent },
              !podium && !isMe && { borderLeftWidth: 3, borderLeftColor: 'transparent' },
            ]}>
              <View style={s.rankPos}>
                {podium
                  ? <Text style={{ fontSize: 22 }}>{podium.label}</Text>
                  : <Text style={[s.rankNum, isMe && { color: C.accent }]}>{i + 1}</Text>
                }
              </View>
              <View>
                <Avatar nickname={r.nickname} avatar_color={r.avatar_color} avatar_image={r.avatar_image} size={podium ? 42 : 36} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={[s.rankNick, podium && { fontSize: 14 }, isMe && { color: C.accent }]}>{r.nickname}</Text>
                  {isMe && <View style={s.meBadge}><Text style={s.meBadgeText}>나</Text></View>}
                </View>
                <Text style={s.rankCount}>{r.workout_count || 0}회 훈련</Text>
              </View>
              <Text style={[s.rankValue, podium && { fontSize: 17, color: podium.rankColor }, isMe && { color: C.accent }]}>{mainValue(r)}</Text>
            </View>
          )
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {picker && (
        <CalendarModal
          current={picker === 'from' ? customFrom : customTo}
          onSelect={str => {
            if (picker === 'from') setCustomFrom(str)
            else setCustomTo(str)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </View>
  )
}

function CalendarModal({ current, onSelect, onClose }) {
  const init = current ? new Date(current) : new Date()
  const [year, setYear]   = useState(init.getFullYear())
  const [month, setMonth] = useState(init.getMonth())

  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAYS   = ['일','월','화','수','목','금','토']
  const today  = new Date().toISOString().slice(0, 10)

  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = Array(Math.ceil((firstDow + daysInMonth) / 7) * 7).fill(null)
  for (let i = 0; i < daysInMonth; i++) cells[firstDow + i] = i + 1

  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1) }

  function select(day) {
    const str = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    onSelect(str)
  }

  return (
    <Modal transparent animationType="slide">
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose} />
      <View style={cal.sheet}>
        {/* 월 네비 */}
        <View style={cal.nav}>
          <TouchableOpacity onPress={prevMonth} style={cal.navBtn}><Text style={cal.navBtnText}>‹</Text></TouchableOpacity>
          <Text style={cal.navTitle}>{year}년 {MONTHS[month]}</Text>
          <TouchableOpacity onPress={nextMonth} style={cal.navBtn}><Text style={cal.navBtnText}>›</Text></TouchableOpacity>
        </View>
        {/* 요일 */}
        <View style={cal.dayRow}>
          {DAYS.map((d, i) => (
            <Text key={d} style={[cal.dayLabel, { color: i===0 ? '#EF4444' : i===6 ? C.accent : C.text2 }]}>{d}</Text>
          ))}
        </View>
        {/* 날짜 */}
        <View style={cal.grid}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={cal.cell} />
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday = dateStr === today
            const isSel   = dateStr === current
            const dow     = i % 7
            return (
              <TouchableOpacity key={i} onPress={() => select(day)} style={[cal.cell, isSel && cal.cellSel, isToday && !isSel && cal.cellToday]}>
                <Text style={[cal.cellText, isSel && { color: '#fff' }, !isSel && dow===0 && { color: '#EF4444' }, !isSel && dow===6 && { color: C.accent }]}>{day}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <TouchableOpacity onPress={onClose} style={cal.closeBtn}>
          <Text style={cal.closeBtnText}>닫기</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderTopWidth: 1, borderColor: C.border },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  navBtnText: { fontSize: 18, fontWeight: '700', color: C.text2 },
  navTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  dayRow: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  cellSel: { backgroundColor: C.accent },
  cellToday: { backgroundColor: C.surfaceHigh },
  cellText: { fontSize: 13, fontWeight: '600', color: C.text },
  closeBtn: { marginTop: 16, backgroundColor: C.surfaceAlt, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: C.text2 },
})

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 24 },

  myPanel: { backgroundColor: '#0C1E38', borderBottomWidth: 1, borderBottomColor: 'rgba(56,189,248,0.15)', padding: 14 },
  myPanelTitle: { fontSize: 10, color: C.accent, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 },
  myPanelDate: { fontSize: 10, color: C.text2, fontWeight: '600', letterSpacing: 0 },
  myStats: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  myStatCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderTopWidth: 2, padding: 12 },
  myStatLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  myStatVal: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  myStatUnit: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  myTotals: { flexDirection: 'row', gap: 8 },
  myTotalCard: { flex: 1, backgroundColor: C.accent + '10', borderWidth: 1, borderColor: C.border, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  myTotalLabel: { fontSize: 11, color: C.text2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  myTotalVal: { fontSize: 15, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  myTotalUnit: { fontSize: 10, fontWeight: '400', color: C.text2, marginLeft: 2 },

  scopeRow: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  scopeTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  scopeTabActive: { borderBottomColor: C.accent },
  scopeTabText: { fontSize: 13, fontWeight: '700', color: C.text2 },
  scopeTabTextActive: { color: C.accent },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  periodDate: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: C.text2, paddingBottom: 8, letterSpacing: 0.3 },
  customDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dateBtnIcon: { fontSize: 16 },
  dateBtnText: { fontSize: 13, fontWeight: '700', color: C.text },
  filterChip: { flex: 1, paddingVertical: 8, backgroundColor: C.surfaceAlt, borderRadius: 100, alignItems: 'center' },
  filterChipActive: { backgroundColor: C.accent + '18', borderWidth: 1, borderColor: C.border },
  filterChipText: { fontSize: 12, fontWeight: '700', color: C.text2 },
  filterChipTextActive: { color: C.accent },

  sportRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sportChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: C.surfaceAlt, borderRadius: 100 },
  sportChipActive: { backgroundColor: C.accent + '18', borderWidth: 1, borderColor: C.border },
  sportChipText: { fontSize: 12, fontWeight: '700', color: C.text2 },
  sportChipTextActive: { color: C.accent },

  myRankBanner: { margin: 12, backgroundColor: C.accent + '18', borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  myRankLabel: { fontSize: 9, color: C.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  myRankNum: { fontSize: 36, fontWeight: '900', color: C.text, letterSpacing: -1.5, lineHeight: 40 },
  myRankSuffix: { fontSize: 14, color: C.text2, marginLeft: 2 },
  myRankDistLabel: { fontSize: 9, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  myRankDist: { fontSize: 22, fontWeight: '900', color: C.accent, letterSpacing: -0.8 },

  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  rankPos: { width: 32, alignItems: 'center', flexShrink: 0 },
  rankNum: { fontSize: 13, fontWeight: '800', color: C.text2 },
  rankAvatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankAvatarText: { fontWeight: '800' },
  rankNick: { fontSize: 13, fontWeight: '700', color: C.text },
  rankCount: { fontSize: 10, color: C.text2, marginTop: 1 },
  rankValue: { fontSize: 14, fontWeight: '900', color: C.text2, letterSpacing: -0.4 },
  meBadge: { backgroundColor: C.accent + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  meBadgeText: { fontSize: 9, color: C.accent, fontWeight: '800' },
})
