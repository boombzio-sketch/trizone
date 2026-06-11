import { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/Avatar'
import { api, cache } from '../utils/api'
import { C } from '../utils/theme'
import { SPORT_LABEL, SPORT_COLOR, SPORT_ICON, formatDuration, formatPace } from '../utils/helpers'

const TABS = [
  { key: 'following', label: '팔로잉' },
  { key: 'club',      label: '클럽' },
  { key: 'all',       label: '전체' },
  { key: 'mine',      label: '내피드' },
]

const TAB_FETCH = {
  following: () => api.getFeed(),
  club:      () => api.getClubFeed(),
  mine:      () => api.getMyFeed(),
  all:       () => api.getAllFeed(),
}

const VIS_MAP = {
  public:         { label: '전체',       icon: '🌍', color: '#10B981' },
  club:           { label: '클럽원',     icon: '👥', color: '#38BDF8' },
  followers:      { label: '팔로워',     icon: '👤', color: '#C084FC' },
  private:        { label: '비공개',     icon: '🔒', color: '#6490B8' },
  club_followers: { label: '클럽+팔로워', icon: '👥', color: '#38BDF8' },
}

export default function FeedScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [tab, setTab] = useState('club')
  const [feeds, setFeeds] = useState([])
  // 캐시가 있으면 즉시 보여주므로 초기 loading은 false. fetch는 백그라운드로 시작.
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [openComments, setOpenComments] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState([])
  const searchTimer = useRef(null)

  // 탭 전환 시: (1) 캐시 즉시 표시 (2) 백그라운드 fetch (3) 성공하면 갱신·캐시 저장
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cached = await cache.get('feed_' + tab)
      if (cancelled) return
      if (cached) {
        setFeeds(cached)
        setLoading(false)
      } else {
        setFeeds([])
        setLoading(true)
      }
      try {
        const rows = await TAB_FETCH[tab]()
        if (cancelled) return
        setFeeds(rows)
        cache.set('feed_' + tab, rows)
      } catch (e) {
        // 캐시가 비어있을 때만 에러 표시 (캐시 있으면 그대로 보여주고 조용히 실패)
        if (!cached && !cancelled) Alert.alert('오류', e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tab])

  async function loadFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const rows = await TAB_FETCH[tab]()
      setFeeds(rows)
      cache.set('feed_' + tab, rows)
    } catch (e) {
      Alert.alert('오류', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function toggleLike(workoutId) {
    try {
      const data = await api.likeWorkout(workoutId)
      setFeeds(prev => prev.map(f =>
        f.id === workoutId ? { ...f, like_count: data.count, my_like: data.liked ? 1 : null } : f
      ))
    } catch {}
  }

  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchQ.trim()) { setSearchRes([]); return }
    searchTimer.current = setTimeout(async () => {
      try { setSearchRes(await api.searchUsers(searchQ)) } catch {}
    }, 300)
  }, [searchQ])

  async function toggleFollow(targetId, isFollowing) {
    try {
      if (isFollowing) await api.unfollow(targetId)
      else await api.follow(targetId)
      setSearchRes(prev => prev.map(u => u.id === targetId ? { ...u, i_follow: isFollowing ? 0 : 1 } : u))
    } catch {}
  }

  async function handleDelete(id) {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await api.deleteWorkout(id)
          setFeeds(prev => prev.filter(f => f.id !== id))
        } catch (e) { Alert.alert('오류', e.message) }
      }},
    ])
  }

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[s.tab, tab === t.key && s.tabActive]}>
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.headerBtns}>
          <TouchableOpacity onPress={() => navigation.navigate('Workout')} style={s.addBtn}>
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowSearch(v => !v); setSearchQ(''); setSearchRes([]) }}
            style={[s.searchBtn, showSearch && { backgroundColor: C.accent + '22', borderColor: C.border }]}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 패널 */}
      {showSearch && (
        <View style={s.searchPanel}>
          <TextInput
            style={s.searchInput}
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder="닉네임으로 검색..."
            placeholderTextColor={C.text2}
            autoFocus
          />
          {searchRes.map(u => (
            <View key={u.id} style={s.searchRow}>
              <Avatar nickname={u.nickname} avatar_color={u.avatar_color} avatar_image={u.avatar_image} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.searchNick}>{u.nickname}</Text>
                <Text style={s.searchSub}>팔로워 {u.follower_count}명</Text>
              </View>
              {u.id !== user?.id && (
                <TouchableOpacity onPress={() => toggleFollow(u.id, u.i_follow)}
                  style={[s.followBtn, u.i_follow && { backgroundColor: C.surfaceHigh }]}>
                  <Text style={[s.followBtnText, u.i_follow && { color: C.accent }]}>
                    {u.i_follow ? '팔로잉' : '팔로우'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : (
        <FlatList
          data={feeds}
          keyExtractor={f => String(f.id)}
          renderItem={({ item }) => (
            <FeedCard
              feed={item}
              myId={user?.id}
              user={user}
              onLike={() => toggleLike(item.id)}
              onDelete={handleDelete}
              openComments={openComments}
              setOpenComments={setOpenComments}
            />
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>
                {tab === 'following' ? '팔로우한 사람이 없어요.' :
                 tab === 'club' ? '클럽 회원의 기록이 없습니다.' :
                 tab === 'mine' ? '아직 내 훈련 기록이 없습니다.' : '훈련 기록이 없습니다.'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
          onRefresh={() => loadFeed(true)}
          refreshing={refreshing}
        />
      )}
    </View>
  )
}

function FeedCard({ feed: f, myId, user, onLike, onDelete, openComments, setOpenComments }) {
  const sc = SPORT_COLOR[f.sport_type] || C.accent
  const isOpen = openComments === f.id
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingC, setLoadingC] = useState(false)
  const vis = VIS_MAP[f.visibility] || VIS_MAP['public']
  const canApprove = user?.role === 'admin' || user?.can_approve

  const segs = f.sport_type === 'brick'
    ? (() => { try { return JSON.parse(f.brick_segments || '[]') } catch { return [] } })()
    : null

  // 피드 API는 표지(photo)와 갯수(photo_count)만 내려보냄.
  // 사용자가 "사진 더보기"를 누를 때 lazy load.
  const coverPhoto = f.photo || null
  const photoCount = Number(f.photo_count || 0) || (coverPhoto ? 1 : 0)
  const [expandedPhotos, setExpandedPhotos] = useState(null)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  async function expandPhotos() {
    if (expandedPhotos || loadingPhotos) return
    setLoadingPhotos(true)
    try {
      const data = await api.getWorkoutPhotos(f.id)
      setExpandedPhotos(data.photos || [])
    } catch {} finally { setLoadingPhotos(false) }
  }

  const allPhotos = expandedPhotos ?? (coverPhoto ? [coverPhoto] : [])

  async function loadComments() {
    setLoadingC(true)
    try {
      const rows = await api.getComments(f.id)
      setComments(rows)
    } finally { setLoadingC(false) }
  }

  async function postComment() {
    if (!commentText.trim()) return
    try {
      const row = await api.postComment(f.id, { body: commentText })
      setComments(prev => [...prev, row])
      setCommentText('')
    } catch {}
  }

  async function deleteComment(cid) {
    try {
      await api.deleteComment(cid)
      setComments(prev => prev.filter(c => c.id !== cid))
    } catch {}
  }

  function toggleComments() {
    if (!isOpen) { setOpenComments(f.id); loadComments() }
    else setOpenComments(null)
  }

  return (
    <View style={[s.card, { borderColor: sc + '30', borderTopColor: sc, borderTopWidth: 3 }]}>
      {/* 작성자 */}
      <View style={s.cardHeader}>
        <Avatar nickname={f.nickname} avatar_color={f.avatar_color} avatar_image={f.avatar_image} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.nickname}>{f.nickname}</Text>
            {f.user_id === myId && (
              <View style={s.meBadge}><Text style={s.meBadgeText}>나</Text></View>
            )}
          </View>
          <Text style={[s.date, { marginTop: 2 }]}>{f.logged_at}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[s.sportBadge, { color: sc }]}>
            {SPORT_ICON[f.sport_type]} {SPORT_LABEL[f.sport_type]}
          </Text>
        </View>
      </View>

      {/* 사진 — 표지만 우선 표시, 사진 갯수 > 1이면 탭으로 펼치기 */}
      {photoCount > 0 && !expandedPhotos && coverPhoto && (
        <TouchableOpacity
          activeOpacity={photoCount > 1 ? 0.7 : 1}
          onPress={photoCount > 1 ? expandPhotos : undefined}
          style={s.photoRow}
        >
          <View>
            <Image source={{ uri: coverPhoto }} style={s.photo} />
            {photoCount > 1 && (
              <View style={s.photoBadge}>
                {loadingPhotos
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.photoBadgeText}>+{photoCount - 1}장</Text>}
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
      {expandedPhotos && expandedPhotos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoRow}>
          {expandedPhotos.map((p, i) => (
            <Image key={i} source={{ uri: p }} style={s.photo} />
          ))}
        </ScrollView>
      )}

      {/* 훈련 데이터 */}
      <View style={[s.metricsBox, { backgroundColor: sc + '10', borderColor: sc + '25' }]}>
        {segs ? (
          segs.map((seg, i) => (
            <View key={i} style={s.segRow}>
              <Text style={s.segLabel}>{SPORT_ICON[seg.sport]} {SPORT_LABEL[seg.sport]}</Text>
              <Text style={s.segVal}>{seg.distance_km}km · {formatDuration(seg.duration_sec)}</Text>
            </View>
          ))
        ) : (
          <View style={s.metricRow}>
            <Metric val={f.distance_km} unit="km" />
            <View style={s.divider} />
            <Metric val={formatDuration(f.duration_sec)} unit="시간" />
            {f.pace > 0 && (
              <>
                <View style={s.divider} />
                <Metric val={formatPace(f.sport_type, f.pace)} unit="페이스" />
              </>
            )}
          </View>
        )}
        {f.memo ? <Text style={s.memo}>{f.memo}</Text> : null}
      </View>

      {/* 내 기록 삭제 */}
      {(f.user_id === myId || user?.role === 'admin') && (
        <TouchableOpacity onPress={() => onDelete(f.id)} style={s.deleteBtn}>
          <Text style={s.deleteBtnText}>삭제</Text>
        </TouchableOpacity>
      )}

      {/* 액션바 */}
      <View style={s.actionBar}>
        <TouchableOpacity onPress={onLike} style={s.actionBtn}>
          <Text style={{ fontSize: 18 }}>{f.my_like ? '⭐' : '☆'}</Text>
          <Text style={[s.actionCount, f.my_like && { color: '#F59E0B' }]}>{f.like_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleComments} style={s.actionBtn}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={[s.actionCount, isOpen && { color: C.accent }]}>{f.comment_count || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* 댓글 */}
      {isOpen && (
        <View style={s.commentSection}>
          {loadingC ? (
            <ActivityIndicator color={C.accent} size="small" style={{ marginVertical: 8 }} />
          ) : comments.length === 0 ? (
            <Text style={s.noComment}>첫 댓글을 남겨보세요!</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={s.commentRow}>
                <Avatar nickname={c.nickname} avatar_color={c.avatar_color} avatar_image={c.avatar_image} size={24} />
                <View style={{ flex: 1 }}>
                  <Text style={s.commentNick}>{c.nickname} </Text>
                  <Text style={s.commentBody}>{c.body}</Text>
                </View>
                {c.user_id === myId && (
                  <TouchableOpacity onPress={() => deleteComment(c.id)}>
                    <Text style={{ color: C.text2, fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          <View style={s.commentInput}>
            <TextInput
              style={s.commentBox}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="댓글 입력..."
              placeholderTextColor={C.text2}
              returnKeyType="send"
              onSubmitEditing={postComment}
            />
            <TouchableOpacity onPress={postComment} style={s.sendBtn}>
              <Text style={s.sendText}>전송</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

function Metric({ val, unit }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={s.metricVal}>{val}</Text>
      <Text style={s.metricUnit}>{unit}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center' },
  tabRow: { flexDirection: 'row', padding: 10, gap: 6 },
  headerBtns: { flexDirection: 'row', gap: 6, paddingRight: 10 },
  addBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  searchBtn: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  searchPanel: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, padding: 12 },
  searchInput: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 13, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  searchAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  searchAvatarText: { fontSize: 13, fontWeight: '800' },
  searchNick: { fontSize: 13, fontWeight: '700', color: C.text },
  searchSub: { fontSize: 10, color: C.text2, marginTop: 1 },
  followBtn: { backgroundColor: C.accent, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  followBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, backgroundColor: C.surfaceAlt },
  tabActive: { backgroundColor: C.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: C.text2 },
  tabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { color: C.text2, fontSize: 14 },

  card: {
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  nickname: { fontSize: 13, fontWeight: '700', color: C.text },
  meBadge: { backgroundColor: C.accent + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  meBadgeText: { fontSize: 9, color: C.accent, fontWeight: '800' },
  date: { fontSize: 10, color: C.text2, marginTop: 2 },
  sportBadge: { fontSize: 12, fontWeight: '700' },

  photoRow: { marginHorizontal: 14, marginBottom: 10 },
  photo: { width: 200, height: 140, borderRadius: 10, marginRight: 6 },
  photoBadge: {
    position: 'absolute', right: 12, bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  photoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  metricsBox: { marginHorizontal: 14, marginBottom: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  divider: { width: 1, height: 32, backgroundColor: C.border },
  metricVal: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  metricUnit: { fontSize: 9, color: C.text2, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  segRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  segLabel: { fontSize: 13, color: C.text2 },
  segVal: { fontSize: 13, fontWeight: '700', color: C.text },
  memo: { marginTop: 10, fontSize: 12, color: C.text2, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, fontStyle: 'italic' },

  deleteBtn: { alignSelf: 'flex-end', marginRight: 14, marginBottom: 4 },
  deleteBtnText: { fontSize: 11, color: C.error, fontWeight: '700' },

  actionBar: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 10, gap: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  actionCount: { fontSize: 13, fontWeight: '700', color: C.text2 },

  commentSection: { backgroundColor: C.surfaceAlt, borderTopWidth: 1, borderTopColor: C.border, padding: 14 },
  noComment: { fontSize: 12, color: C.text2, marginBottom: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 8, fontWeight: '800' },
  commentNick: { fontSize: 11, fontWeight: '700', color: C.accent },
  commentBody: { fontSize: 12, color: C.text2 },
  commentInput: { flexDirection: 'row', gap: 8, marginTop: 8 },
  commentBox: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    color: C.text, fontSize: 12,
  },
  sendBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
