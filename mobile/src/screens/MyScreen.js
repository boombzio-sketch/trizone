import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/Avatar'
import { api } from '../utils/api'
import { C } from '../utils/theme'
import { SPORT_COLOR, SPORT_ICON, SPORT_LABEL, formatDuration } from '../utils/helpers'

const AVATAR_COLORS = ['#4DB8FF','#00DC82','#FFA000','#CC64FF','#FF5080','#00BFFF','#FF8C42','#A8FF3E','#4F9CF9','#EF4444','#F59E0B','#10B981']

export default function MyScreen() {
  const { user, logout, refreshUser } = useAuth()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ password: '', avatar_color: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [msgBody, setMsgBody] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [selectedThread, setSelectedThread] = useState(null)
  const [followersModal, setFollowersModal] = useState(null)
  const [followingModal, setFollowingModal] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    api.getProfile(user.id).then(setProfile).catch(() => {})
    api.getMyMessages().then(setMessages).catch(() => {})
  }, [user])

  async function openFollowers() {
    const rows = await api.getFollowers(user.id)
    setFollowersModal(rows)
  }
  async function openFollowing() {
    const rows = await api.getFollowing(user.id)
    setFollowingModal(rows)
  }
  async function toggleFollow(targetId, isFollowing) {
    try {
      if (isFollowing) await api.unfollow(targetId)
      else await api.follow(targetId)
      const update = list => list.map(u => u.id === targetId ? { ...u, i_follow: isFollowing ? 0 : 1 } : u)
      setFollowersModal(prev => prev ? update(prev) : prev)
      setFollowingModal(prev => prev ? update(prev) : prev)
    } catch {}
  }

  function openEdit() {
    setEditForm({ password: '', avatar_color: user?.avatar_color || '#4DB8FF' })
    setEditError('')
    setEditOpen(true)
  }
  async function handleSave() {
    setEditSaving(true); setEditError('')
    try {
      await api.updateProfile(editForm)
      await refreshUser()
      setEditOpen(false)
    } catch (e) { setEditError(e.message) }
    finally { setEditSaving(false) }
  }

  async function sendMsg() {
    if (!msgBody.trim()) return
    setMsgSending(true)
    try {
      await api.sendMessage(msgBody)
      setMsgBody(''); setComposeOpen(false)
      const rows = await api.getMyMessages()
      setMessages(rows)
    } catch (e) { Alert.alert('오류', e.message) }
    finally { setMsgSending(false) }
  }

  async function openThread(msg) {
    try {
      const thread = await api.getThread(msg.id)
      setSelectedThread(thread)
      const rows = await api.getMyMessages()
      setMessages(rows)
    } catch {}
  }

  const stats = profile?.stats || []
  const totalWorkouts = stats.reduce((a, s) => a + (s.cnt || 0), 0)
  const avatarColor = user?.avatar_color || C.accent

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>내 정보</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 14 }}>

        {/* 프로필 카드 */}
        <View style={s.profileCard}>
          <View style={s.profileTop}>
            {/* 아바타 */}
            <Avatar nickname={user?.nickname} avatar_color={user?.avatar_color} avatar_image={user?.avatar_image} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={s.nickname}>{user?.nickname}</Text>
              <View style={s.badgeRow}>
                {user?.role === 'admin' && <View style={[s.badge, { backgroundColor: '#854D0E22' }]}><Text style={[s.badgeText, { color: '#F59E0B' }]}>👑 관리자</Text></View>}
                {user?.can_approve && user?.role !== 'admin' && <View style={[s.badge, { backgroundColor: '#10B98122' }]}><Text style={[s.badgeText, { color: '#10B981' }]}>✅ 승인관리자</Text></View>}
                {user?.is_club_leader && <View style={[s.badge, { backgroundColor: C.accent + '22' }]}><Text style={[s.badgeText, { color: C.accent }]}>🏆 클럽관리자</Text></View>}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={openEdit} style={s.editBtn}><Text style={s.editBtnText}>수정</Text></TouchableOpacity>
              <TouchableOpacity onPress={logout} style={s.logoutBtn}><Text style={s.logoutBtnText}>로그아웃</Text></TouchableOpacity>
            </View>
          </View>

          {/* 팔로워/팔로잉/훈련 수 */}
          <View style={s.statsRow}>
            {[
              { label: '팔로워', val: profile?.follower_count || 0, onPress: openFollowers },
              { label: '팔로잉', val: profile?.following_count || 0, onPress: openFollowing },
              { label: '총 훈련', val: totalWorkouts, onPress: null },
            ].map((item, i) => (
              <TouchableOpacity key={i} onPress={item.onPress} style={s.statItem} disabled={!item.onPress}>
                <Text style={s.statVal}>{item.val}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 최근 훈련 */}
        {profile?.recentWorkouts?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>최근 훈련</Text>
            {profile.recentWorkouts.map(w => {
              const sc = SPORT_COLOR[w.sport_type]
              return (
                <View key={w.id} style={[s.workoutCard, { borderTopColor: sc, borderColor: sc + '25', backgroundColor: sc + '08' }]}>
                  <View style={[s.workoutIcon, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                    <Text style={{ fontSize: 18 }}>{SPORT_ICON[w.sport_type]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.workoutType, { color: sc }]}>{SPORT_LABEL[w.sport_type]}</Text>
                    <Text style={s.workoutTime}>{formatDuration(w.duration_sec)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.workoutDist}>{(w.distance_km||0).toFixed(2)}<Text style={[s.workoutDistUnit, { color: sc }]}>km</Text></Text>
                    <Text style={s.workoutDate}>{w.logged_at}</Text>
                  </View>
                </View>
              )
            })}
          </>
        )}

        {/* 관리자 문의 */}
        <View style={{ marginTop: 16 }}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>관리자 문의</Text>
            <TouchableOpacity onPress={() => { setComposeOpen(true); setMsgBody('') }} style={s.composeBtn}>
              <Text style={s.composeBtnText}>+ 문의하기</Text>
            </TouchableOpacity>
          </View>
          {messages.length === 0
            ? <Text style={s.emptyText}>문의 내역이 없습니다.</Text>
            : messages.map(m => (
              <TouchableOpacity key={m.id} onPress={() => openThread(m)} style={s.msgCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <Text style={s.msgBody} numberOfLines={1}>{m.body}</Text>
                  {m.unread_replies > 0 && <View style={s.replyBadge}><Text style={s.replyBadgeText}>답장</Text></View>}
                </View>
                <Text style={s.msgDate}>{m.created_at?.slice(0, 16).replace('T', ' ')}</Text>
              </TouchableOpacity>
            ))
          }
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 프로필 편집 모달 */}
      <Modal visible={editOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>프로필 수정</Text>
            {user?.email ? (
              <View style={{ backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 14 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.text2, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.6 }}>이메일</Text>
                <Text style={{ fontSize: 13, color: C.text }}>{user.email}</Text>
              </View>
            ) : null}
            <Text style={s.fieldLabel}>아바타 색상</Text>
            <View style={s.colorGrid}>
              {AVATAR_COLORS.map(color => (
                <TouchableOpacity key={color} onPress={() => setEditForm(p => ({ ...p, avatar_color: color }))}
                  style={[s.colorDot, { backgroundColor: color, borderWidth: editForm.avatar_color === color ? 3 : 0, borderColor: '#fff' }]} />
              ))}
            </View>
            <Text style={[s.fieldLabel, { marginTop: 14 }]}>새 비밀번호</Text>
            <TextInput style={s.modalInput} value={editForm.password}
              onChangeText={v => setEditForm(p => ({ ...p, password: v }))}
              placeholder="변경 시만 입력 (4자 이상)" placeholderTextColor={C.text2}
              secureTextEntry autoCapitalize="none" />
            {editError ? <View style={s.errorBox}><Text style={s.errorText}>{editError}</Text></View> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <TouchableOpacity onPress={() => setEditOpen(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={editSaving} style={[s.saveBtn, editSaving && { backgroundColor: C.surfaceHigh }]}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>💾 저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 문의 작성 모달 */}
      <Modal visible={composeOpen} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <Text style={s.modalTitle}>📨 관리자에게 문의</Text>
            <TextInput style={[s.modalInput, { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }]}
              value={msgBody} onChangeText={setMsgBody}
              placeholder="문의 내용을 입력하세요..." placeholderTextColor={C.text2}
              multiline />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setComposeOpen(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity onPress={sendMsg} disabled={msgSending || !msgBody.trim()} style={[s.saveBtn, (msgSending || !msgBody.trim()) && { backgroundColor: C.surfaceHigh }]}>
                {msgSending ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>📨 전송</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 스레드 모달 */}
      {selectedThread && (
        <Modal visible transparent animationType="slide">
          <View style={s.sheetOverlay}>
            <View style={[s.sheet, { maxHeight: '75%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 }}>
                <Text style={s.modalTitle}>📨 문의 내역</Text>
                <TouchableOpacity onPress={() => setSelectedThread(null)}><Text style={{ color: C.text2, fontSize: 18 }}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView>
                <View style={s.threadMsg}>
                  <Text style={s.threadMeta}>{selectedThread.original?.from_nickname} · {selectedThread.original?.created_at?.slice(0, 16).replace('T', ' ')}</Text>
                  <Text style={s.threadBody}>{selectedThread.original?.body}</Text>
                </View>
                {selectedThread.replies?.length === 0
                  ? <Text style={s.emptyText}>아직 답장이 없습니다.</Text>
                  : selectedThread.replies?.map(r => (
                    <View key={r.id} style={[s.threadReply]}>
                      <Text style={[s.threadMeta, { color: C.accent }]}>관리자 · {r.created_at?.slice(0, 16).replace('T', ' ')}</Text>
                      <Text style={s.threadBody}>{r.body}</Text>
                    </View>
                  ))
                }
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 팔로워/팔로잉 모달 */}
      {(followersModal || followingModal) && (
        <FollowModal
          title={followersModal ? '팔로워' : '팔로잉'}
          list={followersModal || followingModal}
          myId={user?.id}
          onToggle={toggleFollow}
          onClose={() => { setFollowersModal(null); setFollowingModal(null) }}
        />
      )}
    </View>
  )
}

function FollowModal({ title, list, myId, onToggle, onClose }) {
  return (
    <Modal visible transparent animationType="slide">
      <View style={s.sheetOverlay}>
        <View style={[s.sheet, { maxHeight: '70%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 }}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: C.text2, fontSize: 18 }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {list.length === 0
              ? <Text style={s.emptyText}>아직 없습니다.</Text>
              : list.map(u => (
                <View key={u.id} style={s.followRow}>
                  <Avatar nickname={u.nickname} avatar_color={u.avatar_color} avatar_image={u.avatar_image} size={38} />
                  <Text style={s.followNick}>{u.nickname}</Text>
                  {u.id !== myId && (
                    <TouchableOpacity onPress={() => onToggle(u.id, u.i_follow)}
                      style={[s.followBtn, u.i_follow && { backgroundColor: C.surfaceHigh }]}>
                      <Text style={[s.followBtnText, u.i_follow && { color: C.accent }]}>
                        {u.i_follow ? '팔로잉' : '팔로우'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            }
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  screenTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },
  profileCard: { backgroundColor: '#0E2040', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(56,189,248,0.15)', marginBottom: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  avatarText: { fontSize: 24, fontWeight: '900' },
  nickname: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  editBtn: { backgroundColor: C.accent + '22', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  logoutBtnText: { fontSize: 12, color: C.text2, fontWeight: '600' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(56,189,248,0.1)', paddingTop: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 26, fontWeight: '900', color: C.accent, letterSpacing: -1 },
  statLabel: { fontSize: 10, color: C.text2, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.6 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  workoutCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderTopWidth: 2, padding: 10, marginBottom: 8 },
  workoutIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  workoutType: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  workoutTime: { fontSize: 11, color: C.text2 },
  workoutDist: { fontSize: 14, fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  workoutDistUnit: { fontSize: 10, marginLeft: 2 },
  workoutDate: { fontSize: 10, color: C.text2 },

  composeBtn: { backgroundColor: C.accent + '22', borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  composeBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },
  msgCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  msgBody: { fontSize: 13, color: C.text, flex: 1 },
  msgDate: { fontSize: 10, color: C.text2, marginTop: 4 },
  replyBadge: { backgroundColor: C.accent, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  replyBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  emptyText: { color: C.text2, fontSize: 12, textAlign: 'center', paddingVertical: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: C.border },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  modalInput: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, color: C.text, fontSize: 14 },
  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 8, padding: 10, marginTop: 8 },
  errorText: { color: C.error, fontSize: 13 },
  cancelBtn: { flex: 1, paddingVertical: 11, backgroundColor: C.surfaceAlt, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: C.text2, fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 2, paddingVertical: 11, backgroundColor: C.accent, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  threadMsg: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 12 },
  threadReply: { backgroundColor: C.accent + '10', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8, marginLeft: 12 },
  threadMeta: { fontSize: 11, color: C.text2, marginBottom: 6 },
  threadBody: { fontSize: 13, color: C.text, lineHeight: 20 },

  followRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  followAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  followAvatarText: { fontSize: 14, fontWeight: '800' },
  followNick: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text },
  followBtn: { backgroundColor: C.accent, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 7 },
  followBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
})
