import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, TextInput,
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
    ...(isAdmin ? ['가입 신청', '회원 관리'] : []),
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
})
