import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE = 'https://trizone-server.onrender.com/api'
const TOKEN_KEY = 'tz_token'

// 콜드스타트 동안 빈 화면 대신 직전 결과를 즉시 보여주기 위한 디스크 캐시.
// JSON 직렬화 가능한 값만 저장. 실패는 조용히 무시.
export const cache = {
  async get(key) {
    try {
      const v = await AsyncStorage.getItem('tz_cache_' + key)
      return v ? JSON.parse(v) : null
    } catch { return null }
  },
  async set(key, value) {
    try { await AsyncStorage.setItem('tz_cache_' + key, JSON.stringify(value)) } catch {}
  },
  async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const ours = keys.filter(k => k.startsWith('tz_cache_'))
      if (ours.length) await AsyncStorage.multiRemove(ours)
    } catch {}
  },
}

export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

// 앱 시작 시 서버 + DB를 미리 깨운다 (Render/Neon 무료 티어 콜드스타트 완화).
// 실패해도 무시 — 어차피 다음 실제 호출이 콜드를 떠안게 됨.
export function warmup() {
  fetch(BASE + '/health').catch(() => {})
}

async function request(path, options = {}) {
  const token = await getToken()
  let res
  try {
    res = await fetch(BASE + path, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch (e) {
    // 네트워크/타임아웃 등 — status는 없음. 호출부에서 401만 강제 로그아웃 처리.
    const err = new Error(e?.message || '네트워크 오류')
    err.network = true
    throw err
  }
  let data = {}
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err = new Error(data.error || '오류가 발생했습니다.')
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // 인증
  register:      (body) => request('/auth/register', { method: 'POST', body }),
  login:         (body) => request('/auth/login', { method: 'POST', body }),
  me:            ()     => request('/auth/me'),
  updateProfile: (body) => request('/users/me', { method: 'PUT', body }),

  // 훈련 기록
  getWorkouts:  (params = '') => request(`/workouts?${params}`),
  addWorkout:   (body)        => request('/workouts', { method: 'POST', body }),
  editWorkout:  (id, body)    => request(`/workouts/${id}`, { method: 'PUT', body }),
  deleteWorkout:(id)          => request(`/workouts/${id}`, { method: 'DELETE' }),
  myStats:      ()            => request('/workouts/stats/me'),

  // 랭킹
  getRanking: (period, sport, scope = 'club', club_id) =>
    request(`/ranking?period=${period}&sport=${sport}&scope=${scope}${club_id ? `&club_id=${club_id}` : ''}`),
  getRankingCustom: (from, to, sport, scope = 'club', club_id) =>
    request(`/ranking?period=custom&from=${from}&to=${to}&sport=${sport}&scope=${scope}${club_id ? `&club_id=${club_id}` : ''}`),

  // 클럽
  getClubs:        (region) => request(`/clubs${region && region !== '전체' ? `?region=${encodeURIComponent(region)}` : ''}`),
  getClub:         (id)     => request(`/clubs/${id}`),
  getMyClubs:      ()       => request('/clubs/mine'),
  getMyLeaderApp:  ()       => request('/clubs/my-leader-app'),
  createClub:      (body)   => request('/clubs', { method: 'POST', body }),
  getClubMembership:     (id)            => request(`/clubs/${id}/membership`),
  getClubMembers:        (id)            => request(`/clubs/${id}/members`),
  getClubPendingMembers: (id)            => request(`/clubs/${id}/pending-members`),
  setClubMemberStatus:   (cid,uid,s)     => request(`/clubs/${cid}/members/${uid}/status`, { method:'PUT', body:{ status:s } }),
  joinClubById:          (id, message)   => request(`/clubs/${id}/join`, { method: 'POST', body: { message } }),
  leaveClubById:         (id)            => request(`/clubs/${id}/leave`, { method: 'DELETE' }),
  getClubAnnouncements:  (id)            => request(`/clubs/${id}/announcements`),
  postClubAnnouncement:  (id, body)      => request(`/clubs/${id}/announcements`, { method:'POST', body }),
  deleteClubAnnouncement:(cid,aid)       => request(`/clubs/${cid}/announcements/${aid}`, { method:'DELETE' }),
  getClubTrainings:      (id)            => request(`/clubs/${id}/trainings`),
  createClubTraining:    (id, body)      => request(`/clubs/${id}/trainings`, { method:'POST', body }),
  updateClubTraining:    (id,tid,body)   => request(`/clubs/${id}/trainings/${tid}`, { method:'PUT', body }),
  deleteClubTraining:    (id,tid)        => request(`/clubs/${id}/trainings/${tid}`, { method:'DELETE' }),
  joinClubTraining:      (id,tid)        => request(`/clubs/${id}/trainings/${tid}/join`, { method:'POST' }),
  leaveClubTraining:     (id,tid)        => request(`/clubs/${id}/trainings/${tid}/leave`, { method:'DELETE' }),
  getTrainingParticipants:(id,tid)       => request(`/clubs/${id}/trainings/${tid}/participants`),
  updateClub:            (id, body)      => request(`/clubs/${id}`, { method:'PUT', body }),
  deleteClub:            (id)            => request(`/clubs/${id}`, { method:'DELETE' }),
  transferClubLeader:    (id, newLeaderId) => request(`/clubs/${id}/transfer-leader`, { method:'PUT', body:{ new_leader_id: newLeaderId } }),
  setClubMemberClubRole: (cid,uid,role)  => request(`/clubs/${cid}/members/${uid}/club-role`, { method:'PUT', body:{ club_role: role } }),

  // 대회
  getRaces:    ()           => request('/races'),
  addRace:     (body)       => request('/races', { method: 'POST', body }),
  updateRace:  (id, body)   => request(`/races/${id}`, { method: 'PUT', body }),
  deleteRace:  (id)         => request(`/races/${id}`, { method: 'DELETE' }),

  // 소셜 - 피드
  getFeed:        () => request('/social/feed'),
  getClubFeed:    () => request('/social/feed/club'),
  getMyFeed:      () => request('/social/feed/mine'),
  getAllFeed:      () => request('/social/feed/all'),
  getWorkoutPhotos: (id) => request(`/social/workout/${id}/photos`),

  // 소셜 - 좋아요/댓글
  likeWorkout:    (id)         => request(`/social/like/${id}`, { method: 'POST' }),
  getLikes:       (id)         => request(`/social/likes/${id}`),
  getComments:    (id)         => request(`/social/comments/${id}`),
  postComment:    (id, body)   => request(`/social/comments/${id}`, { method: 'POST', body }),
  deleteComment:  (id)         => request(`/social/comments/${id}`, { method: 'DELETE' }),

  // 소셜 - 프로필/팔로우
  getProfile:     (id)         => request(`/social/profile/${id}`),
  getFollowers:   (id)         => request(`/social/followers/${id}`),
  getFollowing:   (id)         => request(`/social/following/${id}`),
  follow:         (id)         => request(`/social/follow/${id}`, { method: 'POST' }),
  unfollow:       (id)         => request(`/social/follow/${id}`, { method: 'DELETE' }),
  searchUsers:    (q)          => request(`/social/users/search?q=${encodeURIComponent(q)}`),

  // 쪽지
  sendMessage:  (body) => request('/messages', { method: 'POST', body: { body } }),
  getMyMessages: ()    => request('/messages/mine'),
  getThread:    (id)   => request(`/messages/${id}/thread`),

  // 비밀번호 재설정
  requestReset:     (email) => request('/auth/request-reset', { method: 'POST', body: { email } }),
  resetPassword:    (body)  => request('/auth/reset-password', { method: 'POST', body }),

  // 관리자
  issueResetToken:   (id)          => request(`/admin/members/${id}/reset-token`, { method: 'POST' }),
  getAdminMembers:   ()            => request('/admin/members'),
  updateAdminMember: (id, body)    => request(`/admin/members/${id}`, { method: 'PUT', body }),
  setAdminMemberRole:(id, role)    => request(`/admin/members/${id}/role`, { method: 'PUT', body: { role } }),
  deleteAdminMember: (id)          => request(`/admin/members/${id}`, { method: 'DELETE' }),
  getInbox:          ()            => request('/messages/inbox'),
  getThread:         (id)          => request(`/messages/${id}/thread`),
  replyMessage:      (id, body)    => request(`/messages/${id}/reply`, { method: 'POST', body: { body } }),
  getPendingMemberships: ()        => request('/admin/memberships'),
  setMembershipStatus: (clubId, userId, status) =>
    request(`/admin/memberships/${clubId}/${userId}/status`, { method: 'PUT', body: { status } }),
}
