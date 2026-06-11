import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, TextInput, Modal,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/Avatar'
import { api } from '../utils/api'
import { C } from '../utils/theme'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'

export default function AdminScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState(0)

  const tabs = [
    '쪽지',
    ...(isAdmin ? ['가입 신청', '회원 관리', '포인트'] : []),
  ]

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backBtnText}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={s.title}>⚙️ 관리</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {tabs.map((t, i) => (
            <TouchableOpacity key={t} onPress={() => setTab(i)} style={[s.tab, tab === i && s.tabActive]}>
              <Text style={[s.tabText, tab === i && s.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {tab === 0 && <MessagesTab />}
      {isAdmin && tab === 1 && <MembershipsTab />}
      {isAdmin && tab === 2 && <MembersTab />}
      {isAdmin && tab === 3 && <PointsTab />}
    </View>
  )
}

/* ─── 쪽지 ─── */
function MessagesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setItems(await api.getInbox()) }
    catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  async function openThread(msg) {
    try {
      const thread = await api.getThread(msg.id)
      setSelected(thread); setReplyText('')
    } catch (e) { Alert.alert('오류', e.message) }
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return
    setReplying(true)
    try {
      const reply = await api.replyMessage(selected.original.id, replyText)
      setSelected(prev => ({ ...prev, replies: [...prev.replies, reply] }))
      setReplyText('')
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setReplying(false) }
  }

  if (loading) return <Center><ActivityIndicator color={C.accent} size="large" /></Center>

  if (selected) {
    const { original, replies } = selected
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => setSelected(null)} style={s.backBtn}>
          <Text style={s.backBtnText}>← 목록</Text>
        </TouchableOpacity>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          <View style={s.threadMsg}>
            <Text style={s.threadMeta}>{original.from_nickname} · {original.created_at?.slice(0, 16).replace('T', ' ')}</Text>
            <Text style={s.threadBody}>{original.body}</Text>
          </View>
          {replies.length === 0
            ? <Text style={[s.emptyText, { textAlign: 'center', marginTop: 16 }]}>아직 답장이 없습니다</Text>
            : replies.map(r => (
              <View key={r.id} style={s.threadReply}>
                <Text style={[s.threadMeta, { color: C.accent }]}>관리자 · {r.created_at?.slice(0, 16).replace('T', ' ')}</Text>
                <Text style={s.threadBody}>{r.body}</Text>
              </View>
            ))
          }
        </ScrollView>
        <View style={s.replyBar}>
          <TextInput style={s.replyInput} value={replyText} onChangeText={setReplyText}
            placeholder="답장 입력..." placeholderTextColor={C.text2} multiline />
          <TouchableOpacity onPress={sendReply} disabled={replying || !replyText.trim()}
            style={[s.replyBtn, (replying || !replyText.trim()) && { backgroundColor: C.surfaceHigh }]}>
            {replying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.replyBtnText}>전송</Text>}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (items.length === 0) return <Center><Text style={s.emptyText}>📭 받은 문의가 없습니다</Text></Center>

  return (
    <FlatList
      data={items}
      keyExtractor={m => String(m.id)}
      contentContainerStyle={{ paddingVertical: 8 }}
      renderItem={({ item: m }) => (
        <TouchableOpacity onPress={() => openThread(m)}
          style={[s.msgRow, !m.is_read && { backgroundColor: C.accent + '10' }]}>
          <Avatar nickname={m.from_nickname} avatar_color={m.from_avatar_color} avatar_image={m.from_avatar_image} size={36} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[s.cardNick, !m.is_read && { color: C.accent }]}>{m.from_nickname}</Text>
              <Text style={s.cardSub}>{m.created_at?.slice(0, 10)}</Text>
            </View>
            <Text style={s.cardSub} numberOfLines={1}>{m.body}</Text>
          </View>
          {!m.is_read && <View style={s.unreadDot} />}
        </TouchableOpacity>
      )}
    />
  )
}

/* ─── 가입 신청 ─── */
function MembershipsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setItems(await api.getPendingMemberships()) }
    catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  async function handle(clubId, userId, status) {
    try {
      await api.setMembershipStatus(clubId, userId, status)
      setItems(prev => prev.filter(m => !(m.club_id === clubId && m.user_id === userId)))
    } catch (e) { Alert.alert('오류', e.message) }
  }

  if (loading) return <Center><ActivityIndicator color={C.accent} size="large" /></Center>
  if (items.length === 0) return <Center><Text style={s.emptyText}>✅ 대기 중인 가입 신청이 없습니다</Text></Center>

  return (
    <FlatList
      data={items}
      keyExtractor={m => String(m.id)}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item: m }) => (
        <View style={[s.card, { borderLeftColor: C.accent }]}>
          <View style={s.cardRow}>
            <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardNick}>{m.nickname}</Text>
              <Text style={s.cardSub}>신청일 {m.applied_at?.slice(0, 10)}</Text>
            </View>
          </View>
          {m.message ? <Text style={[s.cardMemo, { marginBottom: 10 }]}>"{m.message}"</Text> : null}
          <View style={s.actionRow}>
            <TouchableOpacity onPress={() => handle(m.club_id, m.user_id, 'rejected')} style={[s.actionBtn, { backgroundColor: C.errorBg }]}>
              <Text style={[s.actionBtnText, { color: C.error }]}>✕ 거절</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handle(m.club_id, m.user_id, 'approved')} style={[s.actionBtn, { flex: 2, backgroundColor: '#10B98120' }]}>
              <Text style={[s.actionBtnText, { color: '#10B981' }]}>✓ 승인</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  )
}

/* ─── 회원 관리 ─── */
function MembersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setMembers(await api.getAdminMembers()) }
    catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  async function toggleRole(m) {
    const newRole = m.role === 'admin' ? 'member' : 'admin'
    Alert.alert('역할 변경', `${m.nickname}을(를) ${newRole === 'admin' ? '관리자' : '일반회원'}으로 변경할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '변경', onPress: async () => {
        try {
          await api.setAdminMemberRole(m.id, newRole)
          setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: newRole } : x))
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  async function deleteMember(m) {
    Alert.alert('회원 삭제', `${m.nickname} 회원을 삭제할까요?\n모든 데이터가 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await api.deleteAdminMember(m.id)
          setMembers(prev => prev.filter(x => x.id !== m.id))
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  if (loading) return <Center><ActivityIndicator color={C.accent} size="large" /></Center>

  return (
    <FlatList
      data={members}
      keyExtractor={m => String(m.id)}
      ListHeaderComponent={<Text style={[s.cardSub, { padding: 12 }]}>총 {members.length}명</Text>}
      renderItem={({ item: m }) => (
        <View style={s.memberRow}>
          <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={36} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.cardNick}>{m.nickname}</Text>
              <View style={[s.roleBadge, m.role === 'admin' && { backgroundColor: '#A855F722' }]}>
                <Text style={[s.roleBadgeText, m.role === 'admin' && { color: '#A855F7' }]}>
                  {m.role === 'admin' ? 'ADMIN' : 'MEMBER'}
                </Text>
              </View>
            </View>
            <Text style={s.cardSub}>{m.email || '이메일 미등록'} · 훈련 {m.workout_count}회</Text>
          </View>
          <View style={{ gap: 4 }}>
            <TouchableOpacity onPress={() => toggleRole(m)} style={s.smBtn}>
              <Text style={s.smBtnText}>{m.role === 'admin' ? '권한해제' : '관리자'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMember(m)} style={[s.smBtn, { backgroundColor: C.errorBg }]}>
              <Text style={[s.smBtnText, { color: C.error }]}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  )
}

/* ─── 포인트 ─── */
const PT_SPORT_LABEL = { swim: '수영', bike: '사이클', run: '런', brick: '브릭' }

function PointsTab() {
  const [settings, setSettings] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [s, m] = await Promise.all([api.getPointSettings(), api.getPointMembers()])
      setSettings(s); setMembers(m)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const s = await api.updatePointSettings({
        auto_enabled: settings.auto_enabled,
        period_start: settings.period_start || null,
        period_end: settings.period_end || null,
      })
      setSettings(s)
      Alert.alert('완료', '설정이 저장되었습니다.')
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setSaving(false) }
  }

  if (loading || !settings) return <Center><ActivityIndicator color={C.accent} size="large" /></Center>

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      {/* 자동지급 설정 */}
      <View style={s.ptSettingsCard}>
        <Text style={s.ptSectionTitle}>⚙️ 자동지급 설정</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardNick}>포인트 자동지급</Text>
            <Text style={s.cardSub}>훈련 기록 시 규칙에 따라 자동 적립</Text>
          </View>
          <TouchableOpacity onPress={() => setSettings(p => ({ ...p, auto_enabled: !p.auto_enabled }))}
            style={[s.ptSwitch, { backgroundColor: settings.auto_enabled ? '#10B981' : C.surfaceHigh }]}>
            <View style={[s.ptSwitchKnob, { alignSelf: settings.auto_enabled ? 'flex-end' : 'flex-start' }]} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.ptFieldLabel}>지급 시작일</Text>
            <TextInput value={settings.period_start || ''} onChangeText={v => setSettings(p => ({ ...p, period_start: v }))}
              placeholder="YYYY-MM-DD" placeholderTextColor={C.text2} autoCapitalize="none"
              style={s.ptInput} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ptFieldLabel}>지급 종료일</Text>
            <TextInput value={settings.period_end || ''} onChangeText={v => setSettings(p => ({ ...p, period_end: v }))}
              placeholder="YYYY-MM-DD" placeholderTextColor={C.text2} autoCapitalize="none"
              style={s.ptInput} />
          </View>
        </View>
        <Text style={[s.cardSub, { marginBottom: 12 }]}>
          기간을 비우면 무제한. 자동지급이 꺼져 있거나 기간 밖이면 적립되지 않습니다. · 월 상한 {(settings.monthly_cap || 10000).toLocaleString()}pt
        </Text>
        <TouchableOpacity onPress={saveSettings} disabled={saving} style={[s.ptSaveBtn, saving && { backgroundColor: C.surfaceHigh }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.ptSaveBtnText}>💾 설정 저장</Text>}
        </TouchableOpacity>
      </View>

      {/* 회원별 포인트 */}
      <Text style={[s.cardSub, { marginBottom: 4, marginLeft: 4 }]}>회원별 포인트 · 총 {members.length}명</Text>
      {members.map(m => (
        <TouchableOpacity key={m.id} onPress={() => setSelected(m)} style={s.ptMemberRow}>
          <Avatar nickname={m.nickname} avatar_color={m.avatar_color} avatar_image={m.avatar_image} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardNick}>{m.nickname}</Text>
            <Text style={s.cardSub}>이번달 적립 {(m.month_accrued || 0).toLocaleString()}pt</Text>
          </View>
          <Text style={s.ptMemberBalance}>{(m.balance || 0).toLocaleString()}<Text style={{ fontSize: 10, color: C.text2 }}> pt</Text></Text>
          <Text style={{ color: C.accent, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />

      {selected && (
        <MemberPointModal member={selected} onClose={() => setSelected(null)}
          onChanged={(bal) => setMembers(prev => prev.map(x => x.id === selected.id ? { ...x, balance: bal } : x))} />
      )}
    </ScrollView>
  )
}

function MemberPointModal({ member, onClose, onChanged }) {
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null) // { id, amount, memo }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setTxs(await api.getMemberPointTx(member.id)) }
    catch (e) { Alert.alert('오류', e.message) }
    finally { setLoading(false) }
  }

  const balance = txs.reduce((a, t) => a + t.amount, 0)
  function pushBalance(list) { onChanged(list.reduce((a, t) => a + t.amount, 0)) }

  async function grant() {
    const amt = parseInt(amount, 10)
    if (!amt) { Alert.alert('확인', '0이 아닌 포인트를 입력하세요.'); return }
    setSaving(true)
    try {
      const tx = await api.grantPoints(member.id, { amount: amt, memo })
      const next = [tx, ...txs]
      setTxs(next); pushBalance(next); setAmount(''); setMemo('')
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setSaving(false) }
  }

  async function saveEdit() {
    const amt = parseInt(editing.amount, 10)
    if (!amt) { Alert.alert('확인', '0이 아닌 포인트를 입력하세요.'); return }
    try {
      const tx = await api.updatePointTx(editing.id, { amount: amt, memo: editing.memo })
      const next = txs.map(t => t.id === tx.id ? tx : t)
      setTxs(next); pushBalance(next); setEditing(null)
    } catch (e) { Alert.alert('오류', e.message) }
  }

  function del(id) {
    Alert.alert('삭제', '이 내역을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await api.deletePointTx(id)
          const next = txs.filter(t => t.id !== id)
          setTxs(next); pushBalance(next)
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.ptSheetOverlay}>
        <View style={s.ptSheet}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.title}>💎 {member.nickname}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: C.text2, fontSize: 18 }}>✕</Text></TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <Text style={s.ptMemberBalanceBig}>{balance.toLocaleString()}<Text style={{ fontSize: 13, color: C.text2 }}> pt</Text></Text>
            <Text style={s.cardSub}>현재 잔액</Text>
          </View>

          {/* 수동 지급/차감 */}
          <View style={s.ptGrantBox}>
            <Text style={[s.ptFieldLabel, { marginBottom: 8 }]}>수동 지급 / 차감 (음수 입력 시 차감)</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="numbers-and-punctuation"
              placeholder="예: 500 또는 -200" placeholderTextColor={C.text2} style={[s.ptInput, { marginBottom: 8 }]} />
            <TextInput value={memo} onChangeText={setMemo} maxLength={200}
              placeholder="사유 (선택)" placeholderTextColor={C.text2} style={[s.ptInput, { marginBottom: 8 }]} />
            <TouchableOpacity onPress={grant} disabled={saving} style={[s.ptGrantBtn, saving && { backgroundColor: C.surfaceHigh }]}>
              {saving ? <ActivityIndicator color="#1A1330" /> : <Text style={s.ptGrantBtnText}>지급 / 차감</Text>}
            </TouchableOpacity>
          </View>

          <Text style={[s.ptFieldLabel, { marginBottom: 6 }]}>적립 내역</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {loading ? <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
              : txs.length === 0 ? <Text style={[s.emptyText, { paddingVertical: 16 }]}>내역이 없습니다.</Text>
              : txs.map(t => (
                editing?.id === t.id ? (
                  <View key={t.id} style={[s.ptTxRow, { flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
                    <TextInput value={editing.amount} onChangeText={v => setEditing(ed => ({ ...ed, amount: v }))}
                      keyboardType="numbers-and-punctuation" placeholder="포인트" placeholderTextColor={C.text2} style={s.ptInput} />
                    <TextInput value={editing.memo} onChangeText={v => setEditing(ed => ({ ...ed, memo: v }))}
                      placeholder="사유" placeholderTextColor={C.text2} style={s.ptInput} />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => setEditing(null)} style={[s.smBtn, { flex: 1, paddingVertical: 9 }]}><Text style={s.smBtnText}>취소</Text></TouchableOpacity>
                      <TouchableOpacity onPress={saveEdit} style={[s.smBtn, { flex: 1, paddingVertical: 9, backgroundColor: C.accent }]}><Text style={[s.smBtnText, { color: '#fff' }]}>저장</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View key={t.id} style={s.ptTxRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardNick}>{t.type === 'auto' ? `${PT_SPORT_LABEL[t.sport_type] || '훈련'} 자동 적립` : (t.memo || '관리자 지급')}</Text>
                      <Text style={s.cardSub}>{(t.created_at || t.earned_date)?.slice(0, 10)} · {t.type === 'auto' ? '자동' : '수동'}</Text>
                    </View>
                    <Text style={[s.ptTxAmount, { color: t.amount >= 0 ? '#10B981' : C.error }]}>
                      {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={() => setEditing({ id: t.id, amount: String(t.amount), memo: t.memo || '' })} style={s.smBtn}>
                      <Text style={s.smBtnText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => del(t.id)} style={[s.smBtn, { backgroundColor: C.errorBg }]}>
                      <Text style={[s.smBtnText, { color: C.error }]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                )
              ))
            }
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function Center({ children }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>{children}</View>
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 0, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: C.text2 },
  tabTextActive: { color: C.accent },
  emptyText: { color: C.text2, fontSize: 14, textAlign: 'center' },

  card: { backgroundColor: C.surface, borderRadius: 14, marginBottom: 10, borderLeftWidth: 4, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  avatarSm: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarSmText: { fontSize: 13, fontWeight: '800' },
  cardNick: { fontSize: 13, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 10, color: C.text2, marginTop: 2 },
  cardKm: { fontSize: 13, fontWeight: '800' },
  metricsBox: { backgroundColor: C.surfaceAlt, marginHorizontal: 12, borderRadius: 10, padding: 10, marginBottom: 10 },
  cardDetail: { fontSize: 13, fontWeight: '700', color: C.text },
  cardMemo: { fontSize: 12, color: C.text2, fontStyle: 'italic', marginTop: 6 },
  segRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  segLabel: { fontSize: 12, color: C.text2 },
  segVal: { fontSize: 12, fontWeight: '700', color: C.text },
  actionRow: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 0 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },

  backBtn: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },
  threadMsg: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 12 },
  threadReply: { backgroundColor: C.accent + '10', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8, marginLeft: 12 },
  threadMeta: { fontSize: 11, color: C.text2, marginBottom: 6 },
  threadBody: { fontSize: 13, color: C.text, lineHeight: 20 },
  replyBar: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.border },
  replyInput: { flex: 1, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: C.text, fontSize: 13 },
  replyBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  replyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  roleBadge: { backgroundColor: C.surfaceAlt, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  roleBadgeText: { fontSize: 9, fontWeight: '700', color: C.text2 },
  smBtn: { backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  smBtnText: { fontSize: 11, fontWeight: '700', color: C.text2 },

  ptSettingsCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  ptSectionTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 12 },
  ptFieldLabel: { fontSize: 11, fontWeight: '700', color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  ptInput: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontSize: 14 },
  ptSwitch: { width: 52, height: 30, borderRadius: 999, padding: 3, justifyContent: 'center' },
  ptSwitchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  ptSaveBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  ptSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ptMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  ptMemberBalance: { fontSize: 15, fontWeight: '900', color: C.gold },
  ptMemberBalanceBig: { fontSize: 30, fontWeight: '900', color: C.gold },
  ptSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  ptSheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderWidth: 1, borderColor: C.border, maxHeight: '88%' },
  ptGrantBox: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 16 },
  ptGrantBtn: { backgroundColor: C.gold, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  ptGrantBtnText: { color: '#1A1330', fontSize: 13, fontWeight: '800' },
  ptTxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  ptTxAmount: { fontSize: 13, fontWeight: '900' },
})
